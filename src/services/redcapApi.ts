import { MockRedcapApiService } from './mockRedcapApi'

export const GENE_MAPPINGS: { [key: string]: string } = {
  '1': 'KIF1A',
  '2': 'PHIP',
  '3': 'PPP2R5D',
  '4': 'MAPK8IP3',
  '5': 'CTNNB1',
  '6': 'PACS2',
  '7': 'CACNA1A',
  '8': 'TNPO2',
  '9': 'DHPS',
  '10': 'HNRNPUL2',
  '11': 'KIF1C',
  '12': 'TKT',
  '13': 'SLC1A4',
  '14': 'CACNA1G',
  '15': 'CDC42BPB',
  '16': 'SLCGA1',
  '17': 'GPT2',
  '18': 'TUBB4A',
  '19': 'MEF2C',
  '23': 'KCNQ3'
};

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
  location_country: string;
  gene: string;
  consent_date: string;
  [key: string]: string | undefined;
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
    // Use mock service if VITE_USE_MOCK is true
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      console.log('Using mock REDCap service');
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
    // If using mock service, return mock data
    if (this.mockService) {
      return this.mockService.fetchRecruitmentData();
    }

    try {
      const formData = new FormData();
      formData.append('token', this.config.apiToken);
      formData.append('content', 'record');
      formData.append('format', 'json');
      formData.append('type', 'flat');
      formData.append('fields[0]', 'record_id');
      formData.append('fields[1]', 'current_age_yr');
      formData.append('fields[2]', 'consent_bch');
      formData.append('fields[3]', 'location_country');
      formData.append('fields[4]', 'gene');
      formData.append('fields[5]', 'consent_bch_date');

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`REDCap API error: ${response.status} - ${errorText}`);
      }

      const rawData = await response.json();
      return this.processParticipantData(rawData);
    } catch (error) {
      console.error('Error fetching data from REDCap:', error);
      throw error;
    }
  }

  private processParticipantData(rawData: any[]): ParticipantData[] {
    return rawData.map(record => {
      // Process age into groups
      const age = record.current_age_yr || '';
      let ageGroup = 'n/a';
      if (age) {
        const ageNum = parseInt(age);
        if (ageNum <= 6) ageGroup = '0-6';
        else if (ageNum <= 17) ageGroup = '7-17';
        else if (ageNum <= 65) ageGroup = '18-65';
        else ageGroup = '65+';
      }

      // Determine consent location (1 = Boston, anything else = Others)
      const consentLocation = record.consent_bch === '1' ? 'Boston' : 'Others';

      // Map location_country (1 = United States, anything else = Others)
      const locationCountry = record.location_country === '1' ? 'United States' : 'Others';

      // Map gene value to actual gene name
      const geneValue = record.gene || '';
      const geneName = GENE_MAPPINGS[geneValue] || geneValue;

      const participantData: ParticipantData = {
        record_id: record.record_id || '',
        age: ageGroup,
        consent_location: consentLocation,
        location_country: locationCountry,
        gene: geneName,
        consent_date: record.consent_bch_date || ''
      };

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