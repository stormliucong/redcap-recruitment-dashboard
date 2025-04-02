import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { RedcapApiService, RedcapConfig, FieldMapping } from '../../services/redcapApi';
import { MockRedcapApiService } from '../../services/mockRedcapApi';

interface ConfigPageProps {
  onSaveConfig: (config: RedcapConfig) => void;
  initialConfig: RedcapConfig | null;
}

const defaultConfig: RedcapConfig = {
  apiUrl: '',
  apiToken: '',
  fields: {
    groups: [],
    timestamps: [],
  },
};

interface ValueMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (mappings: { [key: string]: string }) => void;
  initialMappings?: { [key: string]: string };
  availableValues: string[];
}

const ValueMappingDialog: React.FC<ValueMappingDialogProps> = ({
  open,
  onClose,
  onSave,
  initialMappings = {},
  availableValues,
}) => {
  const [mappings, setMappings] = useState<{ [key: string]: string }>(initialMappings);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState('');

  const handleAddMapping = () => {
    if (selectedValues.length > 0 && mergedName) {
      const newMappings = { ...mappings };
      selectedValues.forEach(value => {
        newMappings[value] = mergedName;
      });
      setMappings(newMappings);
      setSelectedValues([]);
      setMergedName('');
    }
  };

  const handleRemoveMapping = (value: string) => {
    const newMappings = { ...mappings };
    delete newMappings[value];
    setMappings(newMappings);
  };

  const unmappedValues = availableValues.filter(
    value => !Object.keys(mappings).includes(value)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Value Mappings</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Mappings
          </Typography>
          <List dense>
            {Object.entries(mappings).reduce((acc, [value, mappedTo]) => {
              const group = acc.find(g => g.mappedTo === mappedTo);
              if (group) {
                group.values.push(value);
              } else {
                acc.push({ mappedTo, values: [value] });
              }
              return acc;
            }, [] as { mappedTo: string; values: string[] }[]).map(({ mappedTo, values }) => (
              <ListItem key={mappedTo}>
                <ListItemText
                  primary={mappedTo}
                  secondary={values.join(', ')}
                />
                <ListItemSecondaryAction>
                  {values.map(value => (
                    <IconButton
                      key={value}
                      edge="end"
                      onClick={() => handleRemoveMapping(value)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  ))}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Values to Merge</InputLabel>
            <Select
              multiple
              value={selectedValues}
              onChange={(e) => setSelectedValues(typeof e.target.value === 'string' ? [] : e.target.value)}
              label="Select Values to Merge"
            >
              {unmappedValues.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Merged Category Name"
            value={mergedName}
            onChange={(e) => setMergedName(e.target.value)}
            disabled={selectedValues.length === 0}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleAddMapping}
            disabled={selectedValues.length === 0 || !mergedName}
            sx={{ mt: 2 }}
          >
            Add Mapping
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => {
          onSave(mappings);
          onClose();
        }} color="primary">
          Save Mappings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AddFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (field: FieldMapping) => void;
  availableFields: string[];
  type: 'group' | 'timestamp';
  availableValues?: string[];
}

const AddFieldDialog: React.FC<AddFieldDialogProps> = ({
  open,
  onClose,
  onAdd,
  availableFields,
  type,
  availableValues = [],
}) => {
  const [redcapField, setRedcapField] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [valueMappings, setValueMappings] = useState<{ [key: string]: string }>({});
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState<string[]>([]);

  // Fetch available values when a field is selected
  useEffect(() => {
    if (redcapField && type === 'group') {
      // Use mock service to get field values
      const mockService = new MockRedcapApiService();
      setFieldValues(mockService.getFieldValues(redcapField));
    }
  }, [redcapField, type]);

  const handleAdd = () => {
    if (redcapField && displayName) {
      onAdd({
        redcapField,
        displayName,
        type,
        valueMappings: Object.keys(valueMappings).length > 0 ? valueMappings : undefined,
      });
      setRedcapField('');
      setDisplayName('');
      setValueMappings({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add {type === 'group' ? 'Group' : 'Timestamp'} Field</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>REDCap Field</InputLabel>
          <Select
            value={redcapField}
            onChange={(e) => setRedcapField(e.target.value)}
          >
            {availableFields.map((field) => (
              <MenuItem key={field} value={field}>
                {field}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          sx={{ mt: 2 }}
        />
        {type === 'group' && redcapField && fieldValues.length > 0 && (
          <Button
            fullWidth
            onClick={() => setMappingDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Configure Value Mappings
          </Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={!redcapField || !displayName}>
          Add
        </Button>
      </DialogActions>

      {type === 'group' && (
        <ValueMappingDialog
          open={mappingDialogOpen}
          onClose={() => setMappingDialogOpen(false)}
          onSave={setValueMappings}
          initialMappings={valueMappings}
          availableValues={fieldValues}
        />
      )}
    </Dialog>
  );
};

interface EditFieldDialogProps extends Omit<AddFieldDialogProps, 'onAdd'> {
  field: FieldMapping;
  onSave: (field: FieldMapping) => void;
  availableFields: string[];
}

const EditFieldDialog: React.FC<EditFieldDialogProps> = ({
  open,
  onClose,
  onSave,
  field,
  type,
  availableFields,
}) => {
  const [displayName, setDisplayName] = useState(field.displayName);
  const [valueMappings, setValueMappings] = useState<{ [key: string]: string }>(field.valueMappings || {});
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState<string[]>([]);

  useEffect(() => {
    if (type === 'group') {
      const mockService = new MockRedcapApiService();
      setFieldValues(mockService.getFieldValues(field.redcapField));
    }
  }, [field.redcapField, type]);

  const handleSave = () => {
    onSave({
      ...field,
      displayName,
      valueMappings: Object.keys(valueMappings).length > 0 ? valueMappings : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit {type === 'group' ? 'Group' : 'Timestamp'} Field</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            REDCap Field: {field.redcapField}
          </Typography>
          <TextField
            fullWidth
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            sx={{ mt: 2 }}
          />
          {type === 'group' && fieldValues.length > 0 && (
            <Button
              fullWidth
              onClick={() => setMappingDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              Configure Value Mappings
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!displayName}>
          Save
        </Button>
      </DialogActions>

      {type === 'group' && (
        <ValueMappingDialog
          open={mappingDialogOpen}
          onClose={() => setMappingDialogOpen(false)}
          onSave={setValueMappings}
          initialMappings={valueMappings}
          availableValues={fieldValues}
        />
      )}
    </Dialog>
  );
};

const ConfigPage: React.FC<ConfigPageProps> = ({ onSaveConfig, initialConfig }) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<RedcapConfig>(initialConfig || defaultConfig);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [editFieldDialogOpen, setEditFieldDialogOpen] = useState(false);
  const [currentFieldType, setCurrentFieldType] = useState<'group' | 'timestamp'>('group');
  const [editingField, setEditingField] = useState<FieldMapping | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const fetchMetadata = async () => {
    if (!config.apiUrl || !config.apiToken) return;

    setLoading(true);
    try {
      const service = new RedcapApiService(config);
      const metadata = await service.getMetadata();
      const fields = metadata.map((field: any) => field.field_name);
      setAvailableFields(fields);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(config);
    setSuccessDialogOpen(true);
    setTimeout(() => {
      setSuccessDialogOpen(false);
      navigate('/');
    }, 2000);
  };

  const handleAddField = (field: FieldMapping) => {
    const newConfig = { ...config };
    if (field.type === 'group') {
      newConfig.fields.groups = [...newConfig.fields.groups, field];
    } else {
      newConfig.fields.timestamps = [...newConfig.fields.timestamps, field];
    }
    setConfig(newConfig);
  };

  const handleEditField = (type: 'group' | 'timestamp', field: FieldMapping) => {
    setCurrentFieldType(type);
    setEditingField(field);
    setEditFieldDialogOpen(true);
  };

  const handleSaveEdit = (updatedField: FieldMapping) => {
    const newConfig = { ...config };
    if (updatedField.type === 'group') {
      newConfig.fields.groups = newConfig.fields.groups.map(f =>
        f.redcapField === updatedField.redcapField ? updatedField : f
      );
    } else {
      newConfig.fields.timestamps = newConfig.fields.timestamps.map(f =>
        f.redcapField === updatedField.redcapField ? updatedField : f
      );
    }
    setConfig(newConfig);
    setEditingField(null);
  };

  const handleRemoveField = (type: 'group' | 'timestamp', index: number) => {
    const newConfig = { ...config };
    if (type === 'group') {
      newConfig.fields.groups = newConfig.fields.groups.filter((_, i) => i !== index);
    } else {
      newConfig.fields.timestamps = newConfig.fields.timestamps.filter((_, i) => i !== index);
    }
    setConfig(newConfig);
  };

  const openAddFieldDialog = (type: 'group' | 'timestamp') => {
    setCurrentFieldType(type);
    setAddFieldDialogOpen(true);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
          Dashboard Configuration
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="REDCap API URL"
              value={config.apiUrl}
              onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="API Token"
              type="password"
              value={config.apiToken}
              onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={fetchMetadata}
              disabled={!config.apiUrl || !config.apiToken || loading}
              sx={{ mr: 2 }}
            >
              {loading ? 'Fetching...' : 'Fetch Available Fields'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading}
            >
              Save Configuration
            </Button>
          </Grid>

          {(availableFields.length > 0 || config.fields.groups.length > 0 || config.fields.timestamps.length > 0) && (
            <>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Group Fields
                  </Typography>
                  <List>
                    {config.fields.groups.map((field, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={field.displayName}
                          secondary={
                            <>
                              REDCap field: {field.redcapField}
                              {field.valueMappings && Object.keys(field.valueMappings).length > 0 && (
                                <Typography variant="caption" display="block">
                                  Has value mappings
                                </Typography>
                              )}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditField('group', field)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveField('group', index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => openAddFieldDialog('group')}
                    sx={{ mt: 2 }}
                  >
                    Add Group Field
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Timestamp Fields
                  </Typography>
                  <List>
                    {config.fields.timestamps.map((field, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={field.displayName}
                          secondary={`REDCap field: ${field.redcapField}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditField('timestamp', field)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveField('timestamp', index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => openAddFieldDialog('timestamp')}
                    sx={{ mt: 2 }}
                  >
                    Add Timestamp Field
                  </Button>
                </Paper>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      <AddFieldDialog
        open={addFieldDialogOpen}
        onClose={() => setAddFieldDialogOpen(false)}
        onAdd={handleAddField}
        availableFields={availableFields}
        type={currentFieldType}
      />

      {editingField && (
        <EditFieldDialog
          open={editFieldDialogOpen}
          onClose={() => {
            setEditFieldDialogOpen(false);
            setEditingField(null);
          }}
          onSave={handleSaveEdit}
          field={editingField}
          type={currentFieldType}
          availableFields={availableFields}
        />
      )}

      <Snackbar
        open={successDialogOpen}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={2000}
      >
        <Alert severity="success" elevation={6} variant="filled">
          Configuration saved successfully! Redirecting to dashboard...
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConfigPage; 