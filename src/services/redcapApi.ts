import { RedcapConfig, ParticipantData, FieldMapping } from './types';
import { MockRedcapApiService } from './mockRedcapApi';

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

export class RedcapApiService {
  private apiUrl: string;
  private apiToken: string;
  private batchNumber: number;
  private timeout: number;
  private mockService: MockRedcapApiService | null = null;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_BATCH_SIZE = 100;

  constructor(config: RedcapConfig) {
    this.apiUrl = config.apiUrl;
    this.apiToken = config.apiToken;
    this.batchNumber = config.batchNumber || this.DEFAULT_BATCH_SIZE;
    this.timeout = config.timeout || this.DEFAULT_TIMEOUT;
    // Use mock service if VITE_USE_MOCK is true
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      this.mockService = new MockRedcapApiService();
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
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
    formData.append('token', this.apiToken);
    formData.append('content', 'record');
    formData.append('type', 'flat');
    formData.append('fields', 'record_id');
    formData.append('format', 'json');
    formData.append('returnFormat', 'json');

    const response = await this.fetchWithTimeout(this.apiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch record IDs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((record: any) => record.record_id);
  }

  private async fetchBatch(recordIds: string[]): Promise<ParticipantData[]> {
    const formData = new URLSearchParams();
    formData.append('token', this.apiToken);
    formData.append('content', 'record');
    formData.append('type', 'flat');
    formData.append('records', recordIds.join(','));
    formData.append('fields[0]', 'record_id');
    formData.append('fields[1]', 'current_age_yr');
    formData.append('fields[2]', 'consent_bch');
    formData.append('fields[3]', 'location_country');
    formData.append('fields[4]', 'gene');
    formData.append('fields[5]', 'consent_bch_date');
    formData.append('format', 'json');
    formData.append('returnFormat', 'json');

    const response = await this.fetchWithTimeout(this.apiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch batch: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processParticipantData(data);
  }

  private processParticipantData(records: any[]): ParticipantData[] {
    return records.map(record => {
      const participantData: ParticipantData = {
        record_id: record.record_id,
        age: 'na',
        consent_location: record.consent_bch,
        location_country: record.location_country,
        gene: record.gene,
        consent_date: record.consent_bch_date,
        survey_completion_date: '', // This field is not available in the current data
      };

      // Process age into groups
      if (record.current_age_yr !== '') {
        const age = parseInt(record.current_age_yr);
        if (age <= 6) participantData.age = '0-6';
        else if (age <= 17) participantData.age = '7-17';
        else if (age <= 65) participantData.age = '18-65';
        else participantData.age = '65+';
      }

      // Process consent location
      if (record.consent_bch === '1') {
        participantData.consent_location = 'Boston';
      } else {
        participantData.consent_location = 'Others';
      }

      // Map location_country (1 = United States, anything else = Others)
      const locationCountry = record.location_country === '1' ? 'United States' : 'Others';
      participantData.location_country = locationCountry;

      // Map gene value to actual gene name
      const geneValue = record.gene || '';
      const geneName = GENE_MAPPINGS[geneValue] || geneValue;
      participantData.gene = geneName;

      return participantData;
    });
  }

  async fetchRecruitmentData(forceRefresh: boolean = false): Promise<ParticipantData[]> {
    try {
      // Fetch all record IDs
      const allRecordIds = await this.fetchAllRecordIds();
      
      // Filter for NHS records
      const nhsRecordIds = allRecordIds.filter(id => id.includes('NHS'));
      
      // Process in batches
      const batches: string[][] = [];
      for (let i = 0; i < nhsRecordIds.length; i += this.batchNumber) {
        batches.push(nhsRecordIds.slice(i, i + this.batchNumber));
      }

      // Fetch each batch and combine results
      const allData: ParticipantData[] = [];
      for (const batch of batches) {
        const batchData = await this.fetchBatch(batch);
        allData.push(...batchData);
      }

      return allData;
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
      throw error;
    }
  }

  async getMetadata(): Promise<any[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.apiToken,
          content: 'metadata',
          format: 'json',
          returnFormat: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const redcapApi = new RedcapApiService({
  apiUrl: import.meta.env.VITE_REDCAP_API_URL || '',
  apiToken: import.meta.env.VITE_REDCAP_API_TOKEN || '',
  timeout: 30000, // 30 seconds
  batchNumber: 100,
}); 