import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Chip,
} from '@mui/material'
import type { RedcapConfig } from './services/redcapApi'
import RecruitmentDashboard from './components/Dashboard/RecruitmentDashboard'
import { format, addMonths } from 'date-fns'

const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f',
      light: '#ff6659',
      dark: '#9a0007',
    },
    secondary: {
      main: '#1976d2',
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (min-width: 1200px)': {
            maxWidth: '1400px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
})

// Default configuration with environment variables
const DEFAULT_CONFIG: RedcapConfig = {
  apiUrl: import.meta.env.VITE_REDCAP_API_URL || '',
  apiToken: import.meta.env.VITE_REDCAP_API_TOKEN || '',
  fields: {
    groups: [
      { redcapField: 'gene', displayName: 'Gene', type: 'group', valueMappings: {} },
      { redcapField: 'consent_location', displayName: 'Consent Location', type: 'group', valueMappings: {} },
      { redcapField: 'age', displayName: 'Age Group', type: 'group', valueMappings: {
        '0-6': '0-6 years',
        '7-17': '7-17 years',
        '18-65': '18-65 years',
        '65+': '65+ years'
      }},
      { redcapField: 'location_country', displayName: 'Location', type: 'group', valueMappings: {
        'United States': 'United States',
        'Others': 'Other Countries'
      }},
      { redcapField: 'consent_location', displayName: 'Consent Location', type: 'group', valueMappings: {
        'Boston': 'Boston',
        'Others': 'Other Locations'
      }},
      { redcapField: 'race', displayName: 'Race', type: 'group', valueMappings: {
        'American Indian or Alaska Native': 'American Indian or Alaska Native',
        'Asian': 'Asian',
        'Native Hawaiian or Pacific Islander': 'Native Hawaiian or Pacific Islander',
        'Black or African American': 'Black or African American',
        'White or Caucasian': 'White or Caucasian',
        'Others': 'Others',
        'Unknown': 'Unknown'
      }},
      { redcapField: 'ethnicity', displayName: 'Ethnicity', type: 'group', valueMappings: {
        'Hispanic or Latino': 'Hispanic or Latino',
        'Not Hispanic or Latino': 'Not Hispanic or Latino',
        'Unknown': 'Unknown'
      }}
    ],
    timestamps: [
      { redcapField: 'consent_date', displayName: 'Consent Date', type: 'timestamp' as const },
      { redcapField: 'mhi_date', displayName: 'MHI Survey Complete', type: 'timestamp' as const },
      { redcapField: 'meds_date_complete', displayName: 'Medication History Survey Complete', type: 'timestamp' as const },
      { redcapField: 'seizure_formdate', displayName: 'Seizure Survey Complete', type: 'timestamp' as const },
      { redcapField: 'survey_quality_of_life_inventory_disability_timestamp', displayName: 'QoL Disability Survey Complete', type: 'timestamp' as const },
      { redcapField: 'cb_date', displayName: 'Caregiver Burden Survey Complete', type: 'timestamp' as const },
      { redcapField: 'transition_page_completion_page_timestamp', displayName: 'Total Survey Queue Surveys Complete', type: 'timestamp' as const },
      { redcapField: 'vl_date', displayName: 'Vineland Assessments Complete', type: 'timestamp' as const },
      { redcapField: 'cbcl_survey_date', displayName: 'CBCL Survey Date', type: 'timestamp' as const }
    ],
  },
  defaults: {
    targetDate: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    targetNumber: '1000'
  }
}


function App() {
  const [config] = useState<RedcapConfig>(DEFAULT_CONFIG);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Container maxWidth={false}>
            <Toolbar disableGutters>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                REDCap Recruitment Dashboard
                {!config?.apiUrl && (
                  <Chip
                    label="Demo Mode"
                    color="primary"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                )}
              </Typography>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth={false} sx={{ flex: 1, py: 4 }}>
          <RecruitmentDashboard redcapConfig={config} />
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
