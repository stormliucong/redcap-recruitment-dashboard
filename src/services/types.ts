export interface RedcapConfig {
  apiUrl: string;
  apiToken: string;
  batchNumber?: number;
  timeout?: number;
}

export interface ParticipantData {
  record_id: string;
  age: string;
  consent_location: string;
  location_country: string;
  gene: string;
  consent_date: string;
  survey_completion_date: string;
}

export interface FieldMapping {
  redcapField: string;
  displayName: string;
  type: 'group' | 'timestamp';
  valueMappings?: { [key: string]: string };
} 