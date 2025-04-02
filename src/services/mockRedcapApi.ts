import type { ParticipantData } from './redcapApi'
import { subDays, format } from 'date-fns';

// Sample metadata that mimics REDCap fields
const MOCK_METADATA = [
  { field_name: 'record_id', field_type: 'text', field_label: 'Record ID' },
  { field_name: 'consent_date', field_type: 'text', field_label: 'Consent Date' },
  { field_name: 'survey_completion_date', field_type: 'text', field_label: 'Survey Completion Date' },
  { field_name: 'gene', field_type: 'radio', field_label: 'Gene' },
  { field_name: 'consent_location', field_type: 'radio', field_label: 'Consent Location' },
  { field_name: 'age', field_type: 'text', field_label: 'Age' },
  { field_name: 'race_ethnicity', field_type: 'radio', field_label: 'Race/Ethnicity' },
  { field_name: 'is_international', field_type: 'radio', field_label: 'Is International' },
];

// Sample values for categorical fields
const MOCK_VALUES = {
  gene: ['Gene A', 'Gene B', 'Gene C', 'Gene D'],
  consent_location: ['Boston', 'Columbia'],
  race_ethnicity: ['White', 'Black', 'Asian', 'Pacific Islander', 'Hispanic', 'Native American', 'Other'],
  is_international: ['Yes', 'No'],
};

// Generate random age between 18 and 80
const randomAge = () => Math.floor(Math.random() * (80 - 18 + 1)) + 18;

// Generate random date within the last year
const randomDate = (startDays: number = 365) => {
  const days = Math.floor(Math.random() * startDays);
  return format(subDays(new Date(), days), 'yyyy-MM-dd');
};

// Generate random value from the available options
const randomValue = (field: string) => {
  const values = MOCK_VALUES[field as keyof typeof MOCK_VALUES] || [];
  return values[Math.floor(Math.random() * values.length)];
};

// Generate mock participants with realistic distributions
const generateMockParticipants = (count: number = 100): ParticipantData[] => {
  return Array.from({ length: count }, (_, i) => ({
    record_id: (i + 1).toString(),
    consent_date: randomDate(365),
    survey_completion_date: randomDate(300),
    gene: randomValue('gene'),
    consent_location: randomValue('consent_location'),
    age: randomAge().toString(),
    race_ethnicity: randomValue('race_ethnicity'),
    is_international: randomValue('is_international'),
  }));
};

export class MockRedcapApiService {
  private participants: ParticipantData[];

  constructor() {
    this.participants = generateMockParticipants();
  }

  async fetchRecruitmentData(): Promise<ParticipantData[]> {
    return new Promise(resolve => {
      setTimeout(() => resolve(this.participants), 500);
    });
  }

  async getMetadata(): Promise<any[]> {
    return new Promise(resolve => {
      setTimeout(() => resolve(MOCK_METADATA), 500);
    });
  }

  getFieldValues(field: string): string[] {
    return MOCK_VALUES[field as keyof typeof MOCK_VALUES] || [];
  }
} 