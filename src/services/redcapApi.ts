import { MockRedcapApiService } from './mockRedcapApi'

export interface FieldMapping {
  redcapField: string;
  displayName: string;
  type: 'group' | 'timestamp';
  valueMappings?: {
    [key: string]: string; // maps original value to display value
  };
}

export interface RedcapConfig {
  apiUrl: string;
  apiToken: string;
  fields: {
    groups: FieldMapping[];
    timestamps: FieldMapping[];
  };
}

export interface ParticipantData {
  record_id: string;
  [key: string]: string | number | boolean | null;
}

export class RedcapApiService {
  private config: RedcapConfig;
  private mockService: MockRedcapApiService | null = null;

  constructor(config: RedcapConfig) {
    this.config = config;
    if (process.env.NODE_ENV === 'development' || this.config.apiUrl.includes('mock-redcap-api')) {
      this.mockService = new MockRedcapApiService();
    }
  }

  async fetchRecruitmentData(): Promise<ParticipantData[]> {
    if (this.mockService) {
      return this.mockService.fetchRecruitmentData();
    }

    try {
      const fields = [
        'record_id',
        ...this.config.fields.groups.map(f => f.redcapField),
        ...this.config.fields.timestamps.map(f => f.redcapField)
      ];

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.config.apiToken,
          content: 'record',
          format: 'json',
          type: 'flat',
          rawOrLabel: 'raw',
          rawOrLabelHeaders: 'raw',
          exportCheckboxLabel: 'false',
          exportSurveyFields: 'false',
          exportDataAccessGroups: 'false',
          returnFormat: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
      throw error;
    }
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