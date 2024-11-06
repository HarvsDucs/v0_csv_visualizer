'use client'

import { useState, ChangeEvent, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { HeatMap } from '@nivo/heatmap'

export function CsvVisualizerAdvanced() {
  const [csvData, setCsvData] = useState<string[][]>([])
  const [columnNames, setColumnNames] = useState<string[]>([])
  const [rowsToShow, setRowsToShow] = useState(5)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError(null)

    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const lines = content.split('\n')
        const parsedData = lines.map(line => line.split(','))
        
        if (parsedData.length > 0) {
          setColumnNames(parsedData[0])
          setCsvData(parsedData.slice(1))
        } else {
          setError('The CSV file appears to be empty.')
        }
      }
      reader.onerror = () => {
        setError('An error occurred while reading the file.')
      }
      reader.readAsText(file)
    }
  }

  const handleSliderChange = (value: number[]) => {
    setRowsToShow(value[0])
  }

  const isNumeric = (value: string) => !isNaN(parseFloat(value)) && isFinite(Number(value))

  const calculateStatistics = (columnData: string[]) => {
    const numericData = columnData.filter(isNumeric).map(Number)
    if (numericData.length === 0) return null

    numericData.sort((a, b) => a - b)
    const length = numericData.length

    const sum = numericData.reduce((acc, val) => acc + val, 0)
    const mean = sum / length
    const median = length % 2 === 0
      ? (numericData[length / 2 - 1] + numericData[length / 2]) / 2
      : numericData[Math.floor(length / 2)]

    const q1 = numericData[Math.floor(length * 0.25)]
    const q3 = numericData[Math.floor(length * 0.75)]

    const mode = numericData.reduce(
      (acc, val) => {
        acc.count[val] = (acc.count[val] || 0) + 1
        if (acc.count[val] > acc.modeCount) {
          acc.modeCount = acc.count[val]
          acc.mode = val
        }
        return acc
      },
      { count: {}, mode: numericData[0], modeCount: 1 }
    ).mode

    return {
      count: length,
      mean: mean.toFixed(2),
      std: Math.sqrt(numericData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / length).toFixed(2),
      min: numericData[0].toFixed(2),
      q1: q1.toFixed(2),
      median: median.toFixed(2),
      q3: q3.toFixed(2),
      max: numericData[length - 1].toFixed(2),
      mode: mode.toFixed(2)
    }
  }

  const statistics = useMemo(() => {
    if (csvData.length === 0) return []

    return columnNames.map((column, index) => {
      const columnData = csvData.map(row => row[index])
      return {
        column,
        stats: calculateStatistics(columnData)
      }
    }).filter(col => col.stats !== null)
  }, [csvData, columnNames])

  const distributionData = useMemo(() => {
    if (csvData.length === 0) return []

    return columnNames.map((column, index) => {
      const columnData = csvData.map(row => row[index])
      const isNumericColumn = columnData.every(isNumeric)

      if (isNumericColumn) {
        const numericData = columnData.map(Number)
        const min = Math.min(...numericData)
        const max = Math.max(...numericData)
        const range = max - min
        const binCount = 10
        const binSize = range / binCount

        const bins = Array(binCount).fill(0)
        numericData.forEach(value => {
          const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1)
          bins[binIndex]++
        })

        return {
          column,
          data: bins.map((count, i) => ({
            bin: `${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`,
            count
          }))
        }
      } else {
        const categoryCounts = columnData.reduce((acc, value) => {
          acc[value] = (acc[value] || 0) + 1
          return acc
        }, {})

        return {
          column,
          data: Object.entries(categoryCounts).map(([category, count]) => ({
            category,
            count
          }))
        }
      }
    })
  }, [csvData, columnNames])

  const correlationData = useMemo(() => {
    if (csvData.length === 0) return []

    const numericColumns = columnNames.filter((_, index) => 
      csvData.every(row => isNumeric(row[index]))
    )

    const correlationMatrix = numericColumns.map((column1, i) => {
      return numericColumns.map((column2, j) => {
        if (i === j) return 1

        const data1 = csvData.map(row => parseFloat(row[columnNames.indexOf(column1)]))
        const data2 = csvData.map(row => parseFloat(row[columnNames.indexOf(column2)]))

        const mean1 = data1.reduce((sum, val) => sum + val, 0) / data1.length
        const mean2 = data2.reduce((sum, val) => sum + val, 0) / data2.length

        const deviation1 = data1.map(val => val - mean1)
        const deviation2 = data2.map(val => val - mean2)

        const sum1 = deviation1.reduce((sum, val) => sum + val * val, 0)
        const sum2 = deviation2.reduce((sum, val) => sum + val * val, 0)

        const correlation = deviation1.reduce((sum, _, i) => sum + deviation1[i] * deviation2[i], 0) / Math.sqrt(sum1 * sum2)

        return parseFloat(correlation.toFixed(2))
      })
    })

    return correlationMatrix.map((row, i) => ({
      id: numericColumns[i],
      data: row.map((value, j) => ({ x: numericColumns[j], y: value }))
    }))
  }, [csvData, columnNames])

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>CSV Visualizer with Statistics and Visualizations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} />
          </div>
          
          {error && <p className="text-red-500">{error}</p>}

          {csvData.length > 0 && (
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Data Preview</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="correlation">Correlation</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rows-slider">Number of rows to show: {rowsToShow}</Label>
                    <Slider
                      id="rows-slider"
                      min={3}
                      max={10}
                      step={1}
                      value={[rowsToShow]}
                      onValueChange={handleSliderChange}
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columnNames.map((column, index) => (
                            <TableHead key={index}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, rowsToShow).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="stats">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Statistic</TableHead>
                        {statistics.map(({ column }) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['count', 'mean', 'std', 'min', 'q1', 'median', 'q3', 'max', 'mode'].map(stat => (
                        <TableRow key={stat}>
                          <TableCell className="font-medium">{stat}</TableCell>
                          {statistics.map(({ column, stats }) => (
                            <TableCell key={column}>{stats[stat]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="distribution">
                <div className="space-y-8">
                  {distributionData.map(({ column, data }) => (
                    <div key={column} className="space-y-2">
                      <h3 className="text-lg font-semibold">{column}</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                          <XAxis dataKey={data[0].bin ? 'bin' : 'category'} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="correlation">
                <div style={{ height: '500px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <HeatMap
                      data={correlationData}
                      margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
                      valueFormat=">-.2f"
                      axisTop={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -90,
                        legend: '',
                        legendOffset: 46
                      }}
                      axisRight={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: '',
                        legendPosition: 'middle',
                        legendOffset: 70
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: '',
                        legendPosition: 'middle',
                        legendOffset: -72
                      }}
                      colors={{
                        type: 'diverging',
                        scheme: 'red_yellow_blue',
                        divergeAt: 0.5,
                        minValue: -1,
                        maxValue: 1
                      }}
                      emptyColor="#555555"
                      legends={[
                        {
                          anchor: 'bottom',
                          translateX: 0,
                          translateY: 30,
                          length: 400,
                          thickness: 8,
                          direction: 'row',
                          tickPosition: 'after',
                          tickSize: 3,
                          tickSpacing: 4,
                          tickOverlap: false,
                          tickFormat: '>-.2f',
                          title: 'Correlation →',
                          titleAlign: 'start',
                          titleOffset: 4
                        }
                      ]}
                    />
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  )
}