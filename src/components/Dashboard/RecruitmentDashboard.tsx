import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
  TextField,
  Button,
  Chip,
} from '@mui/material'
import { RedcapApiService, RedcapConfig, ParticipantData, FieldMapping } from '../../services/redcapApi'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Area,
  ResponsiveContainer,
} from 'recharts'
import { 
  format, 
  parseISO, 
  eachWeekOfInterval, 
  subMonths,
  addMonths,
  differenceInMonths,
  isAfter,
} from 'date-fns'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadIcon from '@mui/icons-material/Download'

interface RecruitmentDashboardProps {
  redcapConfig: RedcapConfig
}

interface CumulativeDataPoint {
  date: string;
  timestamp: number;
  total: number | undefined;
  projected?: number;
  trendProjected?: number;
  upperBound?: number;
  lowerBound?: number;
  category: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

// Default fields if none are configured
const DEFAULT_FIELDS: RedcapConfig['fields'] = {
  groups: [
    { redcapField: 'gene', displayName: 'Gene', type: 'group' as const, valueMappings: {} },
    { redcapField: 'consent_location', displayName: 'Consent Location', type: 'group' as const, valueMappings: {} },
    { redcapField: 'race_ethnicity', displayName: 'Race/Ethnicity', type: 'group' as const, valueMappings: {} },
    { redcapField: 'is_international', displayName: 'Is International', type: 'group' as const, valueMappings: {} },
  ],
  timestamps: [
    { redcapField: 'consent_date', displayName: 'Consent Date', type: 'timestamp' as const },
    { redcapField: 'survey_completion_date', displayName: 'Survey Completion', type: 'timestamp' as const },
  ],
};

const ResponsiveChart = ({ children }: { children: React.ReactElement }) => (
  <Box
    sx={{
      width: '100%',
      height: '400px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}
  >
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </Box>
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const RecruitmentDashboard: React.FC<RecruitmentDashboardProps> = ({ redcapConfig }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ParticipantData[]>([]);
  const [selectedGene, setSelectedGene] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('location_country');
  const [selectedTimestamp, setSelectedTimestamp] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [targetDate, setTargetDate] = useState(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [targetNumber, setTargetNumber] = useState('1000');
  const [monthlyTarget, setMonthlyTarget] = useState<string>('');
  const [averageMonthlyGrowth, setAverageMonthlyGrowth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const fields = {
    groups: redcapConfig.fields.groups.length > 0 ? redcapConfig.fields.groups : DEFAULT_FIELDS.groups,
    timestamps: redcapConfig.fields.timestamps.length > 0 ? redcapConfig.fields.timestamps : DEFAULT_FIELDS.timestamps,
  };

  // Get gene field and other group fields
  const otherGroupFields = fields.groups.filter(f => f.redcapField !== 'gene');

  // Get unique gene values from the data
  const uniqueGenes = ['ALL', ...Array.from(new Set(data.map(record => record.gene as string))).sort()];

  // Define the age group order
  const AGE_GROUP_ORDER = ['0-6', '7-17', '18-65', '65+'];

  // Define the available group fields
  const GROUP_FIELDS = {
    ALL: {
      displayName: 'All Groups',
      values: ['Total']
    },
    age: {
      displayName: 'Age Group',
      values: AGE_GROUP_ORDER
    },
    location_country: {
      displayName: 'Location',
      values: ['United States', 'Others']
    },
    consent_location: {
      displayName: 'Consent Location',
      values: ['Boston', 'Others']
    },
    race: {
      displayName: 'Race',
      values: [
        'American Indian or Alaska Native',
        'Asian',
        'Native Hawaiian or Pacific Islander',
        'Black or African American',
        'White or Caucasian',
        'Others',
        'Unknown'
      ]
    },
    ethnicity: {
      displayName: 'Ethnicity',
      values: [
        'Hispanic or Latino',
        'Not Hispanic or Latino',
        'Unknown'
      ]
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const service = new RedcapApiService(redcapConfig);
        const recruitmentData = await service.fetchRecruitmentData();
        setData(recruitmentData);

        // Set initial selections if not already set
        if (!selectedGene) {
          setSelectedGene('ALL');
        }
        if (!selectedGroup && otherGroupFields.length > 0) {
          setSelectedGroup(otherGroupFields[0].redcapField);
        }
        if (!selectedTimestamp) {
          setSelectedTimestamp(fields.timestamps[0].redcapField);
        }
        setLastUpdateTime(new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [redcapConfig]);

  // New useEffect for calculating average monthly growth
  useEffect(() => {
    if (!selectedTimestamp || selectedTimestamp === 'ALL' || !data.length) return;

    const dateField = selectedTimestamp;
    const now = new Date();
    const intervals = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));

    // Calculate cumulative totals for each month
    const monthlyCounts = intervals.map(intervalStart => {
      const intervalEnd = new Date(intervalStart.getFullYear(), intervalStart.getMonth() + 1, 0);
      return data.filter(record => {
        const recordDateStr = record[dateField];
        if (!recordDateStr || typeof recordDateStr !== 'string') return false;
        const recordDate = parseISO(recordDateStr);
        return recordDate <= intervalEnd;
      }).length;
    });

    // Calculate monthly growths
    const monthlyGrowths = [];
    for (let i = 1; i < monthlyCounts.length; i++) {
      monthlyGrowths.push(monthlyCounts[i] - monthlyCounts[i - 1]);
    }

    // Calculate and set average
    if (monthlyGrowths.length > 0) {
      const avgGrowth = monthlyGrowths.reduce((sum, growth) => sum + growth, 0) / monthlyGrowths.length;
      setAverageMonthlyGrowth(avgGrowth);
    }
  }, [data, selectedTimestamp]);

  useEffect(() => {
    if (!selectedGroup) return;

  }, [selectedGroup, data, fields.groups]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const processTimeSeriesData = () => {
    if (!selectedTimestamp) return [];

    const group2Field = selectedGroup;
    const group2Config = fields.groups.find(f => f.redcapField === group2Field) as FieldMapping | undefined;

    // Filter data based on selected gene
    const filteredData = selectedGene === 'ALL' 
      ? data 
      : data.filter(record => record.gene === selectedGene);

    // Helper function to get mapped value
    const getMappedValue = (originalValue: string, config?: FieldMapping) => {
      const mappings = config?.valueMappings as { [key: string]: string } | undefined;
      if (!mappings || Object.keys(mappings).length === 0) {
        return originalValue;
      }
      return mappings[originalValue] ?? originalValue;
    };

    // Get unique mapped categories for group2
    const getUniqueMappedCategories = (field: string, config?: FieldMapping) => {
      if (field === 'ALL') return ['Total'];
      const uniqueValues = new Set(filteredData.map(record => getMappedValue(record[field] as string, config)));
      return Array.from(uniqueValues);
    };

    if (selectedTimestamp === 'ALL') {
      if (group2Field === 'ALL') {
        return [{
          name: 'Total',
          value: filteredData.length
        }];
      }

      const groupCounts: { [key: string]: number } = {};
      filteredData.forEach(record => {
        const value2 = group2Field === 'ALL' ? 'Total' : getMappedValue(record[group2Field] as string, group2Config);
        groupCounts[value2] = (groupCounts[value2] || 0) + 1;
      });

      return Object.entries(groupCounts).map(([name, value]) => ({
        name,
        value,
      }));
    }

    const dateField = selectedTimestamp;
    const now = new Date();
    const startDate =  subMonths(now, 3) 
    const intervals = eachWeekOfInterval({ start: startDate, end: now })
      

    const group2Categories = getUniqueMappedCategories(group2Field, group2Config);

    return intervals.map(interval => {
      const intervalData: any = {
        name: format(interval, 'MMM dd'),
      };

      // Calculate counts for each category in group2
      group2Categories.forEach(cat2 => {
        const count = filteredData.filter(record => {
          const recordDateStr = record[dateField];
          if (!recordDateStr || typeof recordDateStr !== 'string') return false;
          
          const recordDate = parseISO(recordDateStr);
          const value2 = group2Field === 'ALL' ? 'Total' : getMappedValue(record[group2Field] as string, group2Config);
          return value2 === cat2 && isAfter(recordDate, interval);
        }).length;
        intervalData[cat2] = count;
      });

      return intervalData;
    });
  };

  // Get unique categories for group2

  const processCumulativeData = (): CumulativeDataPoint[] => {
    if (!selectedTimestamp || selectedTimestamp === 'ALL') return [];

    const dateField = selectedTimestamp;
    const now = new Date();
    const intervals = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));

    // Filter data based on selected gene
    const filteredData = selectedGene === 'ALL' 
      ? data 
      : data.filter(record => record.gene === selectedGene);

    // Calculate cumulative totals
    const dataPoints = intervals.map(intervalStart => {
      const intervalEnd = new Date(intervalStart.getFullYear(), intervalStart.getMonth() + 1, 0);
      let total = 0;

      filteredData.forEach(record => {
        const recordDateStr = record[dateField];
        if (recordDateStr && typeof recordDateStr === 'string') {
          const recordDate = parseISO(recordDateStr);
          if (recordDate <= intervalEnd) {
            total += 1;
          }
        }
      });

      const isCurrentOrPast = 
        intervalStart.getFullYear() < now.getFullYear() ||
        (intervalStart.getFullYear() === now.getFullYear() && 
         intervalStart.getMonth() <= now.getMonth());

      return {
        date: format(intervalStart, 'MMM yyyy'),
        timestamp: intervalStart.getTime(),
        total: isCurrentOrPast ? total : undefined,
        category: 'Total',
        projected: 0,
        trendProjected: 0,
        upperBound: 0,
        lowerBound: 0,
      };
    });

    // Calculate monthly growth rates
    const monthlyGrowths: number[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      const prevTotal = dataPoints[i - 1].total || 0;
      const currentTotal = dataPoints[i].total || 0;
      const growth = currentTotal - prevTotal;
      monthlyGrowths.push(growth);
    }

    // Calculate standard deviation
    const avgGrowth = monthlyGrowths.length > 0
      ? monthlyGrowths.reduce((sum, growth) => sum + growth, 0) / monthlyGrowths.length
      : 0;

    const stdDev = monthlyGrowths.length > 0
      ? Math.sqrt(
          monthlyGrowths.reduce((sum, growth) => sum + Math.pow(growth - avgGrowth, 2), 0) / monthlyGrowths.length
        )
      : 0;

    // Use user-specified monthly target or calculated average growth
    const trendRate = monthlyTarget ? parseInt(monthlyTarget) : avgGrowth;

    // Calculate projection
    const target = parseISO(targetDate);
    const targetTotal = parseInt(targetNumber);
    const lastActualPoint = dataPoints[dataPoints.length - 1];
    const lastActual = lastActualPoint?.total || 0;
    const monthsToTarget = differenceInMonths(target, now) - 1;
    
    if (monthsToTarget > 0) {
      const targetRate = (targetTotal - lastActual) / monthsToTarget;
      const projectionMonths = Array.from(
        { length: monthsToTarget }, 
        (_, i) => addMonths(now, i + 1)
      );

      let currentProjected = lastActual;
      projectionMonths.forEach((month, index) => {
        currentProjected += targetRate;
        const trendProjected = lastActual + trendRate * (index + 1);
        const confidenceMargin = stdDev * Math.sqrt(index + 1) * 2;
        
        dataPoints.push({
          date: format(month, 'MMM yyyy'),
          timestamp: month.getTime(),
          total: undefined,
          projected: Math.round(currentProjected),
          trendProjected: Math.round(trendProjected),
          upperBound: Math.round(trendProjected + confidenceMargin),
          lowerBound: Math.max(lastActual, Math.round(trendProjected - confidenceMargin)),
          category: 'Total',
        });
      });
    }

    return dataPoints;
  };

  const handleForceRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const service = new RedcapApiService(redcapConfig);
      const response = await service.fetchRecruitmentData(true); // Pass true to force refresh
      setData(response);
      setLastUpdateTime(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCache = () => {
    try {
      // Create a JSON blob with the current data
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `redcap-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading data:', error);
      setError('Failed to download data');
    }
  };

  const handleGroupChange = (event: SelectChangeEvent) => {
    setSelectedGroup(event.target.value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const chartData = processTimeSeriesData();
  const cumulativeData = processCumulativeData();

  // Create gene stats for the dashboard header
  const geneStats = data.reduce((acc, curr) => {
    if (curr.gene) {
      acc[curr.gene] = (acc[curr.gene] || 0) + 1;
    }
    return acc;
  }, {} as { [key: string]: number });

  return (
    <Box sx={{ 
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      bgcolor: 'background.default',
      overflow: 'hidden',
    }}>
      <Paper 
        elevation={1} 
        square
        sx={{ 
          width: '100%',
          mb: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ 
          width: '100%',
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h2">
                  Recruitment Dashboard
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {lastUpdateTime && (
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {new Date(lastUpdateTime).toLocaleString()}
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleForceRefresh}
                    disabled={isLoading}
                  >
                    {isLoading ? <CircularProgress size={24} /> : 'Force Refresh'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadCache}
                    disabled={isLoading || data.length === 0}
                  >
                    Download Data
                  </Button>
                </Box>
              </Box>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="dashboard tabs"
                variant="fullWidth"
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'primary.main',
                  },
                  '& .MuiTab-root': {
                    minWidth: { xs: 'auto', sm: 160 },
                    '&:focus': {
                      outline: 'none',
                    },
                    '&.Mui-selected': {
                      color: 'primary.main',
                    },
                  },
                }}
              >
                <Tab 
                  label="Distribution" 
                  sx={{
                    '&.MuiTab-root': {
                      '&:focus-visible': {
                        outline: 'none',
                      },
                    },
                  }}
                />
                <Tab 
                  label="Cumulative & Projection" 
                  sx={{
                    '&.MuiTab-root': {
                      '&:focus-visible': {
                        outline: 'none',
                      },
                    },
                  }}
                />
              </Tabs>
            </Grid>
            
            <Grid item xs={12}>
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Gene</InputLabel>
                      <Select
                        value={selectedGene}
                        label="Gene"
                        onChange={(e: SelectChangeEvent) => setSelectedGene(e.target.value)}
                      >
                        {uniqueGenes.map((gene) => (
                          <MenuItem key={gene} value={gene}>
                            {gene === 'ALL' ? 'All Genes' : gene}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Group By</InputLabel>
                      <Select
                        value={selectedGroup}
                        label="Group By"
                        onChange={handleGroupChange}
                      >
                        {Object.entries(GROUP_FIELDS).map(([key, field]) => (
                          <MenuItem key={key} value={key}>
                            {field.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Timestamp Field</InputLabel>
                      <Select
                        value={selectedTimestamp}
                        label="Timestamp Field"
                        onChange={(e: SelectChangeEvent) => setSelectedTimestamp(e.target.value)}
                      >
                        <MenuItem value="ALL">All Time</MenuItem>
                        {fields.timestamps.map((field) => (
                          <MenuItem key={field.redcapField} value={field.redcapField}>
                            {field.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Gene</InputLabel>
                      <Select
                        value={selectedGene}
                        label="Gene"
                        onChange={(e: SelectChangeEvent) => setSelectedGene(e.target.value)}
                      >
                        {uniqueGenes.map((gene) => (
                          <MenuItem key={gene} value={gene}>
                            {gene === 'ALL' ? 'All Genes' : gene}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Timestamp Field</InputLabel>
                      <Select
                        value={selectedTimestamp}
                        label="Timestamp Field"
                        onChange={(e: SelectChangeEvent) => setSelectedTimestamp(e.target.value)}
                      >
                        {fields.timestamps.map(field => (
                          <MenuItem key={field.redcapField} value={field.redcapField}>
                            {field.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Target Date"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Target Number"
                      type="number"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Monthly Target (Optional)"
                      type="number"
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(e.target.value)}
                      placeholder={data.length > 0 ? `Default: ${Math.round(averageMonthlyGrowth)}` : ''}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText="Leave empty to use historical average"
                    />
                  </Grid>
                </Grid>
              </TabPanel>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Box sx={{ 
        width: '100%',
        margin: '0 auto',
        px: { xs: 2, sm: 3, md: 4 },
      }}>
        <Paper 
          elevation={1}
          sx={{ 
            width: '100%',
            p: { xs: 2, sm: 3 },
            borderRadius: 1,
          }}
        >
          <ResponsiveChart>
            {tabValue === 0 ? (
              selectedTimestamp === 'ALL' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => selectedGroup === 'ALL' ? name : `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    tick={{
                      fontSize: '0.75rem',
                      dy: 10,
                    }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tickCount={5}
                  />
                  <Tooltip />
                  <Legend />
                  {selectedGroup === 'ALL' ? (
                    <Bar dataKey="Total" fill={COLORS[0]} />
                  ) : (
                    Array.from(new Set(data.map(record => {
                      const value2 = record[selectedGroup] as string;
                      const fieldConfig2 = fields.groups.find(f => f.redcapField === selectedGroup);
                      const mappings2 = fieldConfig2?.valueMappings as { [key: string]: string } | undefined;
                      return mappings2?.[value2] ?? value2;
                    }))).map((category, index) => (
                      <Bar key={category} dataKey={category} fill={COLORS[index % COLORS.length]} />
                    ))
                  )}
                </BarChart>
              )
            ) : (
              <LineChart
                data={cumulativeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{
                    fontSize: '0.75rem',
                    dy: 10,
                  }}
                />
                <YAxis 
                  allowDecimals={false}
                  tickCount={5}
                />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    if (!value) return ['', ''];
                    const pointDate = parseISO(props.payload.date);
                    const now = new Date();
                    const target = parseISO(targetDate);
                    const lastActualPoint = cumulativeData.find(d => !d.projected);
                    const lastActualValue = lastActualPoint?.total || 0;
                    const monthsToTarget = differenceInMonths(target, now) - 1;
                    const requiredMonthlyRate = Math.round((parseInt(targetNumber) - lastActualValue) / monthsToTarget);

                    if (pointDate > now && name === 'total') {
                      return ['', ''];
                    }

                    switch (name) {
                      case 'total':
                        return [`Total: ${Math.round(value)}`, 'Actual'];
                      case 'projected':
                        if (pointDate <= now) {
                          return ['', ''];
                        }
                        return [
                          `Total: ${Math.round(value)} (+${requiredMonthlyRate}/month)`,
                          'Target Projection'
                        ];
                      case 'trendProjected':
                        if (pointDate <= now) {
                          return ['', ''];
                        }
                        const monthlyRate = monthlyTarget ? parseInt(monthlyTarget) : Math.round(averageMonthlyGrowth);
                        return [
                          `Total: ${Math.round(value)} (+${monthlyRate}/month)`,
                          'Trend Projection'
                        ];
                      case 'upperBound':
                      case 'lowerBound':
                        return ['', 'Confidence Interval'];
                      default:
                        return [Math.round(value), name];
                    }
                  }}
                />
                <Legend />
                <defs>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8884d8" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="url(#confidenceGradient)"
                  fillOpacity={1}
                  name="Confidence Interval"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  name="Confidence Interval"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS[0]}
                  name="Actual"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke={COLORS[0]}
                  name="Target Projection"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="trendProjected"
                  stroke={COLORS[0]}
                  name="Trend Projection"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveChart>
        </Paper>
      </Box>

      <Paper 
        elevation={1} 
        square
        sx={{ 
          width: '100%',
          mt: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ 
          width: '100%',
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Gene Distribution
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(geneStats).sort(([a], [b]) => a.localeCompare(b)).map(([gene, count]) => (
                  <Chip
                    key={gene}
                    label={`${gene}: ${count}`}
                    color={selectedGene === gene ? 'primary' : 'default'}
                    onClick={() => setSelectedGene(gene)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default RecruitmentDashboard; 