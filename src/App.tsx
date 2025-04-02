import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
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
import ConfigPage from './components/Config/ConfigPage'
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

// Demo configuration with mock API URL
const DEMO_CONFIG: RedcapConfig = {
  apiUrl: 'https://mock-redcap-api.example.com/api/',
  apiToken: 'demo-token',
  fields: {
    groups: [],
    timestamps: [],
  },
}

function App() {
  const [config, setConfig] = useState<RedcapConfig | null>(() => {
    const savedConfig = localStorage.getItem('redcapConfig')
    return savedConfig ? JSON.parse(savedConfig) : DEMO_CONFIG
  })

  const handleConfigSave = (newConfig: RedcapConfig) => {
    setConfig(newConfig)
    localStorage.setItem('redcapConfig', JSON.stringify(newConfig))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static">
            <Container maxWidth={false}>
              <Toolbar disableGutters>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                  REDCap Recruitment Dashboard
                  <Chip
                    label="Demo Mode"
                    color="primary"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Typography>
                <Box>
                  <Button color="inherit" component={Link} to="/" sx={{ mx: 1 }}>
                    Dashboard
                  </Button>
                  <Button color="inherit" component={Link} to="/config" sx={{ mx: 1 }}>
                    Configuration
                  </Button>
                </Box>
              </Toolbar>
            </Container>
          </AppBar>

          <Container maxWidth={false} sx={{ flex: 1, py: 4 }}>
            <Routes>
              <Route
                path="/"
                element={
                  config ? (
                    <RecruitmentDashboard redcapConfig={config} />
                  ) : (
                    <Box sx={{ 
                      textAlign: 'center', 
                      mt: 8,
                      p: 3,
                      maxWidth: 600,
                      mx: 'auto'
                    }}>
                      <Typography variant="h5" gutterBottom>
                        Welcome to REDCap Recruitment Dashboard
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        Please configure your REDCap API settings to get started.
                      </Typography>
                      <Button
                        variant="contained"
                        component={Link}
                        to="/config"
                        sx={{ mt: 2 }}
                      >
                        Configure Dashboard
                      </Button>
                    </Box>
                  )
                }
              />
              <Route
                path="/config"
                element={<ConfigPage onSaveConfig={handleConfigSave} initialConfig={config} />}
              />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
