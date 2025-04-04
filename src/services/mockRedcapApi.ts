import type { ParticipantData } from './redcapApi'
import { GENE_MAPPINGS } from './redcapApi';

// Sample values for categorical fields
const MOCK_VALUES = {
  gene: ['Gene A', 'Gene B', 'Gene C', 'Gene D'],
  consent_location: ['Boston', 'Columbia'],
  race_ethnicity: ['White', 'Black', 'Asian', 'Pacific Islander', 'Hispanic', 'Native American', 'Other'],
  is_international: ['Yes', 'No'],
};


export class MockRedcapApiService {
  private generateMockData(): ParticipantData[] {
    const mockData: ParticipantData[] = [];
    const geneKeys = Object.keys(GENE_MAPPINGS);

    // Generate 100 mock records
    for (let i = 0; i < 100; i++) {
      const geneKey = geneKeys[Math.floor(Math.random() * geneKeys.length)];
      const geneName = GENE_MAPPINGS[geneKey];
      
      mockData.push({
        record_id: `NHS${i + 1}`,
        age: this.getRandomAgeGroup(),
        consent_location: Math.random() > 0.5 ? 'Boston' : 'Others',
        location_country: Math.random() > 0.3 ? 'United States' : 'Others',
        gene: geneName,
        consent_date: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        race: this.getRandomRace(),
        ethnicity: this.getRandomEthnicity(),
        mhi_date: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        meds_date_complete: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        seizure_formdate: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        cb_date: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        vl_date: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        cbcl_survey_date: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        survey_quality_of_life_inventory_disability_timestamp: this.getRandomDate(new Date(2023, 0, 1), new Date()),
        transition_page_completion_page_timestamp: this.getRandomDate(new Date(2023, 0, 1), new Date())
      });
    }

    return mockData;
  }

  private getRandomAgeGroup(): string {
    const groups = ['0-6', '7-17', '18-65', '65+'];
    return groups[Math.floor(Math.random() * groups.length)];
  }

  private getRandomRace(): string {
    const races = [
      'American Indian or Alaksa Native',
      'Asian',
      'Native Hawaiian or Pacific Islander',
      'Black or African American',
      'White or Caucasian',
      'Others',
      'Unknown'
    ];
    return races[Math.floor(Math.random() * races.length)];
  }

  private getRandomEthnicity(): string {
    const ethnicities = [
      'Hispanic or Latino',
      'Not Hispanic or Latino',
      'Unknown'
    ];
    return ethnicities[Math.floor(Math.random() * ethnicities.length)];
  }

  private getRandomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  async fetchRecruitmentData(): Promise<ParticipantData[]> {
    return this.generateMockData();
  }

  async getMetadata(): Promise<any[]> {
    return [];
  }

  getFieldValues(field: string): string[] {
    return MOCK_VALUES[field as keyof typeof MOCK_VALUES] || [];
  }
} 