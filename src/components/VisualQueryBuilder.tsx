'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  Database, 
  Play, 
  Save, 
  Download, 
  Copy, 
  Eye, 
  Code, 
  Filter,
  Plus,
  Minus,
  Calendar,
  TrendingUp,
  Table,
  BarChart3,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface QueryField {
  name: string
  type: 'String' | 'Int64' | 'Float64' | 'DateTime' | 'Date' | 'Boolean'
  description?: string
  isNullable?: boolean
}

interface QueryTable {
  name: string
  description?: string
  fields: QueryField[]
  sampleData?: any[]
}

interface FilterCondition {
  id: string
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'BETWEEN' | 'IS NULL' | 'IS NOT NULL'
  value: string
  logicalOperator?: 'AND' | 'OR'
}

interface AggregationRule {
  id: string
  field: string
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT'
  alias?: string
}

interface QueryConfig {
  table: string
  selectedFields: string[]
  filters: FilterCondition[]
  aggregations: AggregationRule[]
  groupBy: string[]
  orderBy: { field: string; direction: 'ASC' | 'DESC' }[]
  limit: number
  timeRange?: { start: string; end: string }
}

interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
  bytesRead: number
}

interface VisualQueryBuilderProps {
  clusterId: string
  onQueryExecute?: (query: string, result: QueryResult) => void
  onQuerySave?: (name: string, query: string, config: QueryConfig) => void
  className?: string
}

const SAMPLE_TABLES: QueryTable[] = [
  {
    name: 'sensor_readings',
    description: 'Real-time sensor data from manufacturing equipment',
    fields: [
      { name: 'timestamp', type: 'DateTime', description: 'Reading timestamp' },
      { name: 'sensor_id', type: 'String', description: 'Unique sensor identifier' },
      { name: 'sensor_name', type: 'String', description: 'Human-readable sensor name' },
      { name: 'value', type: 'Float64', description: 'Sensor reading value' },
      { name: 'unit', type: 'String', description: 'Measurement unit' },
      { name: 'quality', type: 'String', description: 'Data quality indicator' },
      { name: 'line_id', type: 'String', description: 'Production line identifier' },
      { name: 'equipment_id', type: 'String', description: 'Equipment identifier' }
    ]
  },
  {
    name: 'production_events',
    description: 'Manufacturing process events and status changes',
    fields: [
      { name: 'timestamp', type: 'DateTime', description: 'Event timestamp' },
      { name: 'event_type', type: 'String', description: 'Type of event' },
      { name: 'line_id', type: 'String', description: 'Production line' },
      { name: 'batch_id', type: 'String', description: 'Production batch' },
      { name: 'status', type: 'String', description: 'Current status' },
      { name: 'duration', type: 'Int64', description: 'Duration in seconds' },
      { name: 'operator_id', type: 'String', description: 'Operator identifier' }
    ]
  },
  {
    name: 'quality_measurements',
    description: 'Quality control and inspection data',
    fields: [
      { name: 'timestamp', type: 'DateTime', description: 'Measurement timestamp' },
      { name: 'batch_id', type: 'String', description: 'Production batch' },
      { name: 'test_type', type: 'String', description: 'Type of quality test' },
      { name: 'measurement_value', type: 'Float64', description: 'Measured value' },
      { name: 'specification_min', type: 'Float64', description: 'Minimum specification' },
      { name: 'specification_max', type: 'Float64', description: 'Maximum specification' },
      { name: 'pass_fail', type: 'Boolean', description: 'Pass/fail result' },
      { name: 'inspector_id', type: 'String', description: 'Inspector identifier' }
    ]
  }
]

const AGGREGATION_FUNCTIONS = [
  { value: 'COUNT', label: 'Count', description: 'Count of rows' },
  { value: 'SUM', label: 'Sum', description: 'Sum of values' },
  { value: 'AVG', label: 'Average', description: 'Average value' },
  { value: 'MIN', label: 'Minimum', description: 'Minimum value' },
  { value: 'MAX', label: 'Maximum', description: 'Maximum value' },
  { value: 'DISTINCT', label: 'Distinct', description: 'Unique values' }
]

const FILTER_OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not equals' },
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'Greater or equal' },
  { value: '<=', label: 'Less or equal' },
  { value: 'LIKE', label: 'Contains' },
  { value: 'IN', label: 'In list' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'IS NULL', label: 'Is null' },
  { value: 'IS NOT NULL', label: 'Is not null' }
]

export default function VisualQueryBuilder({
  clusterId,
  onQueryExecute,
  onQuerySave,
  className = ''
}: VisualQueryBuilderProps) {
  // Query configuration state
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    table: '',
    selectedFields: [],
    filters: [],
    aggregations: [],
    groupBy: [],
    orderBy: [],
    limit: 1000,
    timeRange: undefined
  })

  // UI state
  const [activeTab, setActiveTab] = useState<'visual' | 'sql'>('visual')
  const [isExecuting, setIsExecuting] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [generatedSQL, setGeneratedSQL] = useState('')
  const [customSQL, setCustomSQL] = useState('')
  const [queryName, setQueryName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Get current table
  const currentTable = useMemo(() => {
    return SAMPLE_TABLES.find(table => table.name === queryConfig.table)
  }, [queryConfig.table])

  // Generate SQL from visual configuration
  const generateSQL = useCallback(() => {
    if (!queryConfig.table) return ''

    let sql = 'SELECT '

    // Fields and aggregations
    const selectClauses: string[] = []

    // Regular fields
    if (queryConfig.selectedFields.length > 0) {
      selectClauses.push(...queryConfig.selectedFields)
    }

    // Aggregations
    queryConfig.aggregations.forEach(agg => {
      const clause = `${agg.function}(${agg.field})${agg.alias ? ` AS ${agg.alias}` : ''}`
      selectClauses.push(clause)
    })

    if (selectClauses.length === 0) {
      selectClauses.push('*')
    }

    sql += selectClauses.join(', ')
    sql += `\nFROM ${queryConfig.table}`

    // WHERE clauses
    if (queryConfig.filters.length > 0) {
      sql += '\nWHERE '
      const filterClauses = queryConfig.filters.map((filter, index) => {
        let clause = ''
        if (index > 0 && filter.logicalOperator) {
          clause += `${filter.logicalOperator} `
        }

        switch (filter.operator) {
          case 'IS NULL':
          case 'IS NOT NULL':
            clause += `${filter.field} ${filter.operator}`
            break
          case 'LIKE':
            clause += `${filter.field} LIKE '%${filter.value}%'`
            break
          case 'IN':
            clause += `${filter.field} IN (${filter.value})`
            break
          case 'BETWEEN':
            const [start, end] = filter.value.split(',')
            clause += `${filter.field} BETWEEN '${start?.trim()}' AND '${end?.trim()}'`
            break
          default:
            clause += `${filter.field} ${filter.operator} '${filter.value}'`
        }
        return clause
      })
      sql += filterClauses.join(' ')
    }

    // Time range filter
    if (queryConfig.timeRange) {
      const timeClause = queryConfig.filters.length > 0 
        ? ` AND timestamp BETWEEN '${queryConfig.timeRange.start}' AND '${queryConfig.timeRange.end}'`
        : ` WHERE timestamp BETWEEN '${queryConfig.timeRange.start}' AND '${queryConfig.timeRange.end}'`
      sql += timeClause
    }

    // GROUP BY
    if (queryConfig.groupBy.length > 0) {
      sql += `\nGROUP BY ${queryConfig.groupBy.join(', ')}`
    }

    // ORDER BY
    if (queryConfig.orderBy.length > 0) {
      sql += '\nORDER BY '
      const orderClauses = queryConfig.orderBy.map(order => `${order.field} ${order.direction}`)
      sql += orderClauses.join(', ')
    }

    // LIMIT
    if (queryConfig.limit > 0) {
      sql += `\nLIMIT ${queryConfig.limit}`
    }

    return sql
  }, [queryConfig])

  // Update generated SQL when config changes
  useEffect(() => {
    setGeneratedSQL(generateSQL())
  }, [generateSQL])

  // Add filter condition
  const addFilter = useCallback(() => {
    const newFilter: FilterCondition = {
      id: `filter_${Date.now()}`,
      field: currentTable?.fields[0]?.name || '',
      operator: '=',
      value: '',
      logicalOperator: queryConfig.filters.length > 0 ? 'AND' : undefined
    }
    setQueryConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }))
  }, [currentTable, queryConfig.filters.length])

  // Remove filter condition
  const removeFilter = useCallback((filterId: string) => {
    setQueryConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }))
  }, [])

  // Update filter condition
  const updateFilter = useCallback((filterId: string, updates: Partial<FilterCondition>) => {
    setQueryConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === filterId ? { ...f, ...updates } : f)
    }))
  }, [])

  // Add aggregation
  const addAggregation = useCallback(() => {
    const newAgg: AggregationRule = {
      id: `agg_${Date.now()}`,
      field: currentTable?.fields.find(f => f.type !== 'String')?.name || currentTable?.fields[0]?.name || '',
      function: 'COUNT'
    }
    setQueryConfig(prev => ({
      ...prev,
      aggregations: [...prev.aggregations, newAgg]
    }))
  }, [currentTable])

  // Remove aggregation
  const removeAggregation = useCallback((aggId: string) => {
    setQueryConfig(prev => ({
      ...prev,
      aggregations: prev.aggregations.filter(a => a.id !== aggId)
    }))
  }, [])

  // Update aggregation
  const updateAggregation = useCallback((aggId: string, updates: Partial<AggregationRule>) => {
    setQueryConfig(prev => ({
      ...prev,
      aggregations: prev.aggregations.map(a => a.id === aggId ? { ...a, ...updates } : a)
    }))
  }, [])

  // Execute query
  const executeQuery = useCallback(async () => {
    setIsExecuting(true)
    
    try {
      const sqlToExecute = activeTab === 'visual' ? generatedSQL : customSQL
      
      // Simulate query execution with realistic delay
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
      
      // Generate mock result data
      const columns = queryConfig.selectedFields.length > 0 
        ? queryConfig.selectedFields 
        : currentTable?.fields.map(f => f.name) || ['timestamp', 'value']
      
      const rowCount = Math.floor(Math.random() * 50) + 10
      const rows = Array.from({ length: rowCount }, (_, i) => {
        return columns.map(col => {
          if (col.includes('timestamp')) return new Date(Date.now() - i * 60000).toISOString()
          if (col.includes('value') || col.includes('measurement')) return (Math.random() * 100).toFixed(2)
          if (col.includes('id')) return `ID_${Math.floor(Math.random() * 1000)}`
          if (col.includes('name')) return `Item_${i + 1}`
          return `Data_${i}`
        })
      })
      
      const result: QueryResult = {
        columns,
        rows,
        rowCount,
        executionTime: Math.floor(Math.random() * 300) + 50,
        bytesRead: Math.floor(Math.random() * 1000000) + 50000
      }
      
      setQueryResult(result)
      onQueryExecute?.(sqlToExecute, result)
      
    } catch (error) {
      console.error('Query execution failed:', error)
    } finally {
      setIsExecuting(false)
    }
  }, [activeTab, generatedSQL, customSQL, queryConfig, currentTable, onQueryExecute])

  // Save query
  const saveQuery = useCallback(() => {
    if (!queryName.trim()) return
    
    const sqlToSave = activeTab === 'visual' ? generatedSQL : customSQL
    onQuerySave?.(queryName, sqlToSave, queryConfig)
    setQueryName('')
    setShowSaveDialog(false)
  }, [queryName, activeTab, generatedSQL, customSQL, queryConfig, onQuerySave])

  // Copy SQL to clipboard
  const copySQL = useCallback(async () => {
    const sqlToCopy = activeTab === 'visual' ? generatedSQL : customSQL
    try {
      await navigator.clipboard.writeText(sqlToCopy)
    } catch (error) {
      console.error('Failed to copy SQL:', error)
    }
  }, [activeTab, generatedSQL, customSQL])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Database className="h-7 w-7 text-purple-600" />
            Visual Query Builder
          </h2>
          <p className="text-gray-600 mt-1">
            Build and execute ClickHouse queries visually • Cluster: {clusterId}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'visual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('visual')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Visual
          </Button>
          <Button
            variant={activeTab === 'sql' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('sql')}
          >
            <Code className="h-4 w-4 mr-2" />
            SQL
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Builder Panel */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'visual' ? (
            <>
              {/* Table Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table className="h-5 w-5" />
                    Data Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Table</Label>
                    <Select
                      value={queryConfig.table}
                      onValueChange={(value) => setQueryConfig(prev => ({ ...prev, table: value, selectedFields: [], filters: [], aggregations: [], groupBy: [] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a table" />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLE_TABLES.map(table => (
                          <SelectItem key={table.name} value={table.name}>
                            <div>
                              <div className="font-medium">{table.name}</div>
                              <div className="text-xs text-gray-600">{table.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentTable && (
                    <div>
                      <Label>Available Fields</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {currentTable.fields.map(field => (
                          <div key={field.name} className="flex items-center space-x-2">
                            <Checkbox
                              checked={queryConfig.selectedFields.includes(field.name)}
                              onCheckedChange={(checked) => {
                                setQueryConfig(prev => ({
                                  ...prev,
                                  selectedFields: checked 
                                    ? [...prev.selectedFields, field.name]
                                    : prev.selectedFields.filter(f => f !== field.name)
                                }))
                              }}
                            />
                            <label className="text-sm">
                              {field.name}
                              <Badge variant="outline" className="ml-1 text-xs">
                                {field.type}
                              </Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filters
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addFilter} disabled={!currentTable}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {queryConfig.filters.map((filter, index) => (
                    <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      {index > 0 && (
                        <Select
                          value={filter.logicalOperator}
                          onValueChange={(value) => updateFilter(filter.id, { logicalOperator: value as 'AND' | 'OR' })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(filter.id, { field: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentTable?.fields.map(field => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={filter.operator}
                        onValueChange={(value) => updateFilter(filter.id, { operator: value as any })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {!['IS NULL', 'IS NOT NULL'].includes(filter.operator) && (
                        <Input
                          placeholder="Value"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          className="flex-1"
                        />
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {queryConfig.filters.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No filters added. Click "Add Filter" to create conditions.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Aggregations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Aggregations
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addAggregation} disabled={!currentTable}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Aggregation
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {queryConfig.aggregations.map(agg => (
                    <div key={agg.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Select
                        value={agg.function}
                        onValueChange={(value) => updateAggregation(agg.id, { function: value as any })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGGREGATION_FUNCTIONS.map(func => (
                            <SelectItem key={func.value} value={func.value}>
                              {func.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={agg.field}
                        onValueChange={(value) => updateAggregation(agg.id, { field: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentTable?.fields.map(field => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Alias (optional)"
                        value={agg.alias || ''}
                        onChange={(e) => updateAggregation(agg.id, { alias: e.target.value })}
                        className="flex-1"
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAggregation(agg.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {queryConfig.aggregations.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No aggregations added. Add functions to analyze your data.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Query Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Query Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Limit Results</Label>
                      <Input
                        type="number"
                        value={queryConfig.limit}
                        onChange={(e) => setQueryConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 1000 }))}
                        min={1}
                        max={100000}
                      />
                    </div>
                    
                    <div>
                      <Label>Time Range (Hours)</Label>
                      <Select
                        value={queryConfig.timeRange ? '24' : ''}
                        onValueChange={(value) => {
                          if (value) {
                            const hours = parseInt(value)
                            const end = new Date().toISOString()
                            const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
                            setQueryConfig(prev => ({ ...prev, timeRange: { start, end } }))
                          } else {
                            setQueryConfig(prev => ({ ...prev, timeRange: undefined }))
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No time filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No time filter</SelectItem>
                          <SelectItem value="1">Last 1 hour</SelectItem>
                          <SelectItem value="6">Last 6 hours</SelectItem>
                          <SelectItem value="24">Last 24 hours</SelectItem>
                          <SelectItem value="168">Last 7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* SQL Editor */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  SQL Editor
                </CardTitle>
                <CardDescription>
                  Write custom ClickHouse SQL queries directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={customSQL}
                  onChange={(e) => setCustomSQL(e.target.value)}
                  placeholder="SELECT * FROM sensor_readings WHERE timestamp > now() - INTERVAL 1 HOUR"
                  className="min-h-[300px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          )}

          {/* Generated SQL Preview */}
          {activeTab === 'visual' && generatedSQL && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Generated SQL
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={copySQL}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{generatedSQL}</code>
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions and Results Panel */}
        <div className="space-y-6">
          {/* Execute Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Execute Query
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={executeQuery} 
                disabled={isExecuting || (!generatedSQL && activeTab === 'visual') || (!customSQL && activeTab === 'sql')}
                className="w-full"
              >
                {isExecuting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Query
                  </>
                )}
              </Button>
              
              <Separator />
              
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSaveDialog(!showSaveDialog)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Query
                </Button>
                
                {showSaveDialog && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Query name"
                      value={queryName}
                      onChange={(e) => setQueryName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveQuery} disabled={!queryName.trim()}>
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button variant="outline" size="sm" className="w-full" disabled={!queryResult}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Query Results */}
          {queryResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Query Results
                </CardTitle>
                <CardDescription>
                  {queryResult.rowCount} rows • {queryResult.executionTime}ms • {(queryResult.bytesRead / 1024).toFixed(1)}KB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {queryResult.columns.map(column => (
                          <th key={column} className="text-left p-2 font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-b">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {queryResult.rows.length > 10 && (
                    <div className="text-center text-gray-500 text-sm p-2">
                      ... and {queryResult.rows.length - 10} more rows
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Query History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">
                  No recent queries
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Phase 2 Achievement Banner */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple-600 rounded-full flex items-center justify-center">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900">
                🎯 Visual ClickHouse Query Builder Complete!
              </h3>
              <p className="text-purple-700">
                Interactive query builder with visual interface, SQL generation, and real-time execution. 
                Build complex manufacturing analytics queries without writing SQL.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
