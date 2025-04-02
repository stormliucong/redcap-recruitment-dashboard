import { MockRedcapApiService } from './mockRedcapApi'

export interface RedcapConfig {
  apiUrl: string;
  apiToken: string;
  batchNumber?: number;
  timeout?: number;
  maxCacheEntries?: number;
}

export interface FieldMapping {
  redcapField: string;
  displayName: string;
  type: 'group' | 'timestamp';
  valueMappings?: {
    [key: string]: string; // maps original value to display value
  };
}

export interface ParticipantData {
  record_id: string;
  age: string;
  consent_location: string;
  is_international: boolean;
  gene: string;
  consent_date: string;
  [key: string]: string | boolean;
}

export class RedcapApiService {
  private config: RedcapConfig;
  private mockService: MockRedcapApiService | null = null;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_MAX_CACHE_ENTRIES = 10;
  private readonly CACHE_KEY_PREFIX = 'redcap_data_';

  constructor(config: RedcapConfig) {
    this.config = {
      ...config,
      batchNumber: config.batchNumber || this.DEFAULT_BATCH_SIZE,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
      maxCacheEntries: config.maxCacheEntries || this.DEFAULT_MAX_CACHE_ENTRIES
    };
    if (process.env.NODE_ENV === 'development' && this.config.apiUrl.includes('mock-redcap-api')) {
      this.mockService = new MockRedcapApiService();
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async fetchAllRecordIds(): Promise<string[]> {
    const formData = new URLSearchParams();
    formData.append('token', this.config.apiToken);
    formData.append('content', 'record');
    formData.append('format', 'json');
    formData.append('type', 'flat');
    formData.append('fields', 'record_id');
    formData.append('returnFormat', 'json');

    const response = await this.fetchWithTimeout(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REDCap API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return data
      .map((record: any) => record.record_id)
      .filter((id: string) => id.includes('NHS'));
  }

  private async fetchBatch(recordIds: string[]): Promise<ParticipantData[]> {
    const fields = [
      'record_id',
      'current_age_yr',
      'consent_bch',
      'location_country',
      'gene',
      'consent_bch_date'
    ];

    const formData = new URLSearchParams();
    formData.append('token', this.config.apiToken);
    formData.append('content', 'record');
    formData.append('format', 'json');
    formData.append('type', 'flat');
    formData.append('fields', fields.join(','));
    formData.append('returnFormat', 'json');
    formData.append('records', recordIds.join(','));

    const response = await this.fetchWithTimeout(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REDCap API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return this.processParticipantData(data);
  }

  private saveToCache(data: ParticipantData[]): void {
    try {
      const timestamp = new Date().toISOString();
      const cacheKey = `${this.CACHE_KEY_PREFIX}${timestamp}`;
      
      // Save the new data
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(`Data cached with key: ${cacheKey}`);

      // Clean up old cache entries
      this.cleanupCache();
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private cleanupCache(): void {
    try {
      // Get all cache keys
      const cacheKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(this.CACHE_KEY_PREFIX))
        .sort();

      // Remove oldest entries if we exceed maxCacheEntries
      const maxEntries = this.config.maxCacheEntries || this.DEFAULT_MAX_CACHE_ENTRIES;
      while (cacheKeys.length > maxEntries) {
        const oldestKey = cacheKeys.shift();
        if (oldestKey) {
          localStorage.removeItem(oldestKey);
          console.log(`Removed old cache entry: ${oldestKey}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  async fetchRecruitmentData(): Promise<ParticipantData[]> {
    if (this.mockService) {
      return this.mockService.fetchRecruitmentData();
    }

    try {
      // First, get all NHS record IDs
      console.log('Fetching all NHS record IDs...');
      const allRecordIds = await this.fetchAllRecordIds();
      console.log(`Found ${allRecordIds.length} NHS records`);

      // Process records in batches
      const batchSize = this.config.batchNumber || this.DEFAULT_BATCH_SIZE;
      const batches = [];
      for (let i = 0; i < allRecordIds.length; i += batchSize) {
        batches.push(allRecordIds.slice(i, i + batchSize));
      }

      // Fetch each batch and combine results
      const allData: ParticipantData[] = [];
      for (let i = 0; i < batches.length; i++) {
        console.log(`Fetching batch ${i + 1} of ${batches.length}...`);
        const batchData = await this.fetchBatch(batches[i]);
        allData.push(...batchData);
      }

      // Save to cache
      this.saveToCache(allData);

      return allData;
    } catch (error) {
      console.error('Error fetching REDCap data:', error);
      throw error;
    }
  }

  private processParticipantData(rawData: any[]): ParticipantData[] {
    return rawData.map(record => {
      // Process age into groups
      const age = record.current_age_yr || '';
      let ageGroup = '';
      if (age) {
        const ageNum = parseInt(age);
        if (ageNum < 5) ageGroup = '0-4';
        else if (ageNum < 10) ageGroup = '5-9';
        else if (ageNum < 15) ageGroup = '10-14';
        else if (ageNum < 20) ageGroup = '15-19';
        else ageGroup = '20+';
      }

      // Determine consent location
      const consentLocation = record.consent_bch || 'Other';

      // Check if international
      const isInternational = record.location_country !== 'United States';

      const participantData: ParticipantData = {
        record_id: record.record_id || '',
        age: ageGroup,
        consent_location: consentLocation,
        is_international: isInternational,
        gene: record.gene || '',
        consent_date: record.consent_bch_date || ''
      };

      // Add any additional fields from the record
      Object.keys(record).forEach(key => {
        if (!(key in participantData)) {
          participantData[key] = String(record[key] || '');
        }
      });

      return participantData;
    });
  }

  async getMetadata(): Promise<any[]> {
    if (this.mockService) {
      return this.mockService.getMetadata();
    }

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.config.apiToken,
          content: 'metadata',
          format: 'json',
          returnFormat: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw error;
    }
  }
}

// Create a singleton instance with default timeout and batch size
export const redcapApi = new RedcapApiService({
  apiUrl: import.meta.env.VITE_REDCAP_API_URL || '',
  apiToken: import.meta.env.VITE_REDCAP_API_TOKEN || '',
  timeout: 30000, // 30 seconds
  batchNumber: 100,
  maxCacheEntries: 10
}); 