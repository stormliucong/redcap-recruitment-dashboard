#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import pandas as pd
from typing import Dict, List, Any
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class RedcapAPITester:
    def __init__(self, api_url: str, api_token: str):
        """Initialize RedcapAPITester with API URL and token."""
        self.api_url = api_url
        self.api_token = api_token
        self.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }

    def test_connection(self) -> bool:
        """Test the connection to REDCap API."""
        try:
            data = {
                'token': self.api_token,
                'content': 'version',
                'format': 'json'
            }
            response = requests.post(self.api_url, data=data)
            response.raise_for_status()
            print(f"Connection successful! REDCap version: {response.text}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"Connection failed: {str(e)}")
            return False

    def get_metadata(self) -> List[Dict[str, Any]]:
        """Retrieve metadata about the project fields."""
        try:
            data = {
                'token': self.api_token,
                'content': 'metadata',
                'format': 'json'
            }
            response = requests.post(self.api_url, data=data)
            response.raise_for_status()
            metadata = response.json()
            print(f"Retrieved metadata for {len(metadata)} fields")
            return metadata
        except requests.exceptions.RequestException as e:
            print(f"Failed to get metadata: {str(e)}")
            return []

    def get_records(self, fields: List[str] = None) -> List[Dict[str, Any]]:
        """Retrieve records with specified fields."""
        try:
            data = {
                'token': self.api_token,
                'content': 'record',
                'format': 'json',
                'type': 'flat'
            }
            if fields:
                data['fields'] = fields

            response = requests.post(self.api_url, data=data)
            response.raise_for_status()
            records = response.json()
            print(f"Retrieved {len(records)} records")
            return records
        except requests.exceptions.RequestException as e:
            print(f"Failed to get records: {str(e)}")
            return []

    def analyze_recruitment_data(self, date_field: str, fields: Dict[str, str]):
        """Analyze recruitment data and display statistics."""
        records = self.get_records([
            date_field,
            fields.get('gender', ''),
            fields.get('age_group', ''),
            fields.get('race_ethnicity', '')
        ])

        if not records:
            print("No records found to analyze")
            return

        # Convert to pandas DataFrame for easier analysis
        df = pd.DataFrame(records)
        
        # Total participants
        print(f"\nTotal Participants: {len(df)}")

        # Weekly recruitment counts
        if date_field in df.columns:
            df['recruitment_date'] = pd.to_datetime(df[date_field])
            weekly_counts = df.resample('W', on='recruitment_date').size()
            print("\nWeekly Recruitment Counts:")
            print(weekly_counts)

        # Demographics
        for field_type, field_name in fields.items():
            if field_name and field_name in df.columns:
                print(f"\n{field_type.title()} Distribution:")
                print(df[field_name].value_counts())

def main():
    # Load configuration from environment variables
    api_url = os.getenv('REDCAP_API_URL')
    api_token = os.getenv('REDCAP_API_TOKEN')

    if not api_url or not api_token:
        print("Please set REDCAP_API_URL and REDCAP_API_TOKEN environment variables")
        print("You can create a .env file with these variables")
        return

    # Initialize tester
    tester = RedcapAPITester(api_url, api_token)

    # Test connection
    if not tester.test_connection():
        return

    # Get metadata
    metadata = tester.get_metadata()
    if metadata:
        print("\nAvailable Fields:")
        for field in metadata:
            print(f"- {field['field_name']}: {field['field_label']}")

    # Example field mapping (update these based on your REDCap project)
    fields = {
        'gender': 'gender',  # replace with your actual field name
        'age_group': 'age_group',  # replace with your actual field name
        'race_ethnicity': 'race_ethnicity'  # replace with your actual field name
    }

    # Analyze recruitment data
    print("\nAnalyzing Recruitment Data:")
    tester.analyze_recruitment_data('recruitment_date', fields)  # replace with your actual date field

if __name__ == "__main__":
    main() 