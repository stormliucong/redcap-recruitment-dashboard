import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Chip,
} from '@mui/material'
import type { RedcapConfig } from './services/redcapApi'
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import RecruitmentDashboard from './components/Dashboard/RecruitmentDashboard'

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
      { redcapField: 'location_country', displayName: 'Location', type: 'group', valueMappings: {} }
    ],
    timestamps: [
      { redcapField: 'consent_date', displayName: 'Consent Date', type: 'timestamp' },
      { redcapField: 'survey_completion_date', displayName: 'Survey Completion', type: 'timestamp' }
    ]
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
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  color="inherit"
                  startIcon={<RefreshIcon />}
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </Box>
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
