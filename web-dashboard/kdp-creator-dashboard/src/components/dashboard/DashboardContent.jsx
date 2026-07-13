import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Image,
  Zap,
  Crown,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  LogOut,
  Loader2,
  Moon,
  Sun,
  Trash2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
import { subscriptionApi, analyticsApi, pdfApi, templateApi } from '@/lib/api'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { SkeletonLoader } from '@/components/SkeletonLoader'
import { EmptyState } from '@/components/EmptyState'
import { Tooltip } from '@/components/Tooltip'
import { PageTransition } from '@/components/animations/PageTransition'
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip'
import { useOnboarding } from '@/hooks/useOnboarding'
import { EmptyProjectsIllustration } from '@/components/illustrations/EmptyProjectsIllustration'
import { EmptyAnalyticsIllustration } from '@/components/illustrations/EmptyAnalyticsIllustration'

import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const unwrapOk = (response) => {
  const body = response?.data
  if (!body) return null
  if (body.ok === false) {
    const message = body.error?.message || body.message || 'Request failed'
    throw new Error(message)
  }
  return body.data ?? body
}

export default function DashboardContent({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [resultType, setResultType] = useState('image')
  const [batchProgress, setBatchProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kdp_dark_mode') === 'true')
  const [templates, setTemplates] = useState([])
  const [trimSize, setTrimSize] = useState('6x9')
  const [targetFormat, setTargetFormat] = useState('kdp-print')
  const [coloringTrimSize, setColoringTrimSize] = useState('6x9')
  const [batchTrimSize, setBatchTrimSize] = useState('6x9')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('kdp_dark_mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    templateApi.getAll().then((res) => setTemplates(res.data.templates))
  }, [])

  const deleteTemplate = async (id) => {
    await templateApi.delete(id)
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const refreshMetrics = async () => {
    const metricsRes = await analyticsApi.getUserMetrics()
    const payload = unwrapOk(metricsRes)
    setMetrics(payload.metrics)
  }

  const handleBatchConvert = async (files) => {
    if (!files || files.length === 0) return
    try {
      setIsProcessing(true)
      setBatchProgress(0)
      setProcessedCount(0)
      setTotalFiles(files.length)
      setPreviewImage(null)
      setResultData(null)
      setResultType('pdf')

      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })
      formData.append('trim_size', batchTrimSize)

      const response = await pdfApi.convertColoringBatch(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setResultData(data.download_url)
      setResultType('pdf')
      setBatchProgress(100)
      setProcessedCount(files.length)
      await refreshMetrics()
    } catch (error) {
      console.error('Batch conversion failed', error)
      alert(`Batch Conversion Error: ${error.message || 'An unknown error occurred.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImageConvert = async (file) => {
    if (!file) return
    try {
      setIsProcessing(true)
      setPreviewImage(null)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('trim_size', coloringTrimSize)

      const response = await pdfApi.convertColoring(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setResultData(data.download_url)
      setResultType('image')
      await refreshMetrics()
    } catch (error) {
      console.error('Coloring conversion failed', error)
      alert(`Coloring Conversion Error: ${error.message || 'An unknown error occurred.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePdfProcess = async (file) => {
    if (!file) return
    try {
      setIsProcessing(true)
      setPreviewImage(null)
      setResultType('pdf')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('trim_size', trimSize)
      formData.append('target_format', targetFormat)

      const response = await pdfApi.convertToKdp(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setResultData(data.download_url)
      await refreshMetrics()
    } catch (error) {
      console.error('PDF processing failed', error)
      alert(`PDF Processing Error: ${error.message || 'An unknown error occurred.'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (!resultData) return
    if (typeof resultData === 'string' && (resultData.startsWith('http') || resultData.startsWith('/'))) {
      window.open(resultData, '_blank', 'noopener,noreferrer')
      return
    }
    const link = document.createElement('a')
    const mime = resultType === 'pdf' ? 'application/pdf' : 'image/png'
    const ext = resultType === 'pdf' ? 'pdf' : 'png'
    link.href = `data:${mime};base64,${resultData}`
    link.download = `kdp_conversion_${Date.now()}.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [subRes, metricsRes] = await Promise.all([
        subscriptionApi.getStatus(),
        analyticsApi.getUserMetrics(),
      ])
      const subPayload = unwrapOk(subRes)
      const metricsPayload = unwrapOk(metricsRes)
      setSubscription(subPayload)
      setMetrics(metricsPayload.metrics)
    } catch (error) {
      console.error('Failed to load dashboard data', error)
      setLoadError(error.message || 'Failed to load dashboard data')
      setSubscription(null)
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const { shouldShowTooltip, dismissTooltip } = useOnboarding()

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="h-10 w-64 bg-muted rounded animate-shimmer" />
          <div className="h-10 w-24 bg-muted rounded animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonLoader count={3} />
        </div>
        <div className="h-96 w-full bg-muted rounded animate-shimmer" />
      </div>
    )
  }

  if (loadError || !subscription || !metrics) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Dashboard unavailable
            </CardTitle>
            <CardDescription>
              {loadError || 'Subscription or metrics data could not be loaded.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={loadDashboardData}>Retry</Button>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { tier_details, current_usage, remaining_usage } = subscription
  const conversionsUsed = current_usage?.conversions ?? 0
  const conversionsLimit = tier_details?.monthly_conversions ?? 0
  const remainingConversions =
    typeof remaining_usage === 'object'
      ? remaining_usage?.conversions
      : remaining_usage
  const remainingLabel =
    remainingConversions === -1 || remainingConversions == null
      ? 'Unlimited'
      : `${remainingConversions} left`

  const dailyChartData = (metrics.daily_activity || []).slice(-7).map((day) => ({
    name: day.date?.slice(5) || day.date,
    value: (day.conversions || 0) + (day.batch_ops || 0),
  }))

  const fileTypeEntries = Object.entries(metrics.file_types || {})
  const pieData =
    fileTypeEntries.length > 0
      ? fileTypeEntries.map(([name, value]) => ({ name, value }))
      : [{ name: 'No data yet', value: 1 }]

  const successEvents = (metrics.daily_activity || []).reduce(
    (sum, day) => sum + (day.conversions || 0) + (day.batch_ops || 0),
    0
  )

  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">KDP Creator Suite</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button onClick={handleLogout} variant="outline" className="hover:shadow-md">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="tools" className="rounded-lg">Tools</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
          <TabsTrigger value="batch" className="rounded-lg">Batch Processing</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PageTransition stagger={true} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{tier_details?.name || 'Free'}</div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {remainingLabel}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Monthly Usage</span>
                    <span>
                      {conversionsUsed} / {conversionsLimit === -1 ? 'Unlimited' : conversionsLimit}
                    </span>
                  </div>
                  <Progress
                    value={
                      conversionsLimit === -1 || conversionsLimit === 0
                        ? 100
                        : Math.min(100, (conversionsUsed / conversionsLimit) * 100)
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total_conversions || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all formats</p>
              </CardContent>
            </Card>

            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.storage_used_mb || 0).toFixed(1)} MB
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cloud asset storage</p>
              </CardContent>
            </Card>
          </PageTransition>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Recent Projects</h2>
            {templates.length === 0 ? (
              <EmptyState
                icon={<EmptyProjectsIllustration />}
                title="No projects yet"
                description="Create your first KDP project to start optimizing your publishing workflow."
                action={{ label: 'Create Project', onClick: () => setActiveTab('tools') }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <Card key={t.id} className="card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <CardDescription>
                        {t.trim_size} • {t.bleed ? 'Bleed' : 'No Bleed'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(t.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => setActiveTab('tools')} className="transition-premium">
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <PageTransition className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    KDP PDF Converter
                    <Tooltip content="Convert standard PDFs to KDP-compliant print-ready files">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Professional print-ready conversion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trim Size</label>
                      <select
                        value={trimSize}
                        onChange={(e) => setTrimSize(e.target.value)}
                        className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="6x9">6 x 9 in</option>
                        <option value="8.5x11">8.5 x 11 in</option>
                        <option value="5.5x8.5">5.5 x 8.5 in</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Format</label>
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="kdp-print">KDP Print (with bleed)</option>
                        <option value="kdp-ebook">KDP eBook</option>
                      </select>
                    </div>
                  </div>

                  <OnboardingTooltip
                    content="Upload your PDF here. We'll automatically format it for KDP."
                    tooltipId="pdf-upload-tooltip"
                    isOpen={shouldShowTooltip('pdf-upload-tooltip')}
                    onDismiss={() => dismissTooltip('pdf-upload-tooltip')}
                    position="top"
                  >
                    <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                      <p className="text-sm text-muted-foreground mb-2">Drag & drop your PDF here</p>
                      <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handlePdfProcess(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </OnboardingTooltip>
                </CardContent>
              </Card>

              <Card className="card glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Image to Coloring Book
                    <Tooltip content="Convert any image into a high-quality coloring page">
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>AI-powered line art extraction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trim Size</label>
                      <select
                        value={coloringTrimSize}
                        onChange={(e) => setColoringTrimSize(e.target.value)}
                        className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="6x9">6 x 9 in</option>
                        <option value="8.5x11">8.5 x 11 in</option>
                        <option value="5.5x8.5">5.5 x 8.5 in</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                    <Image className="h-8 w-8 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                    <p className="text-sm text-muted-foreground mb-2">Upload image to convert</p>
                    <p className="text-xs text-muted-foreground mb-4">Supports JPG, PNG</p>
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleImageConvert(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {isProcessing && (
              <Card className="card glass border-primary/20">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Processing your file...</h3>
                  <p className="text-muted-foreground">
                    This may take a few moments depending on file size.
                  </p>
                </CardContent>
              </Card>
            )}

            {previewImage && !isProcessing && (
              <Card className="card glass border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Processing Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="aspect-video relative rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                    <img
                      src={
                        previewImage.startsWith('http') || previewImage.startsWith('data:')
                          ? previewImage
                          : `data:image/jpeg;base64,${previewImage}`
                      }
                      alt="Preview"
                      className="max-h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewImage(null)
                        setResultData(null)
                      }}
                    >
                      Process Another
                    </Button>
                    <Button onClick={downloadResult} className="transition-premium">
                      <Download className="mr-2 h-4 w-4" />
                      Download {resultType === 'pdf' ? 'PDF' : 'Image'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </PageTransition>
        </TabsContent>

        <TabsContent value="analytics">
          <PageTransition className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Live metrics from your last 30 days of processing activity.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Events (30 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{successEvents}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" /> Conversions + batch ops
                  </p>
                </CardContent>
              </Card>
              <Card className="card glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total conversions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.total_conversions || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Counted from analytics events</p>
                </CardContent>
              </Card>
              <Card className="card glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Batch operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.total_batch_operations || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">This billing window</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card glass">
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>Activity over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {dailyChartData.length === 0 || dailyChartData.every((d) => d.value === 0) ? (
                    <EmptyState
                      icon={<EmptyAnalyticsIllustration />}
                      title="No activity yet"
                      description="Run a conversion to populate usage trends."
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--muted-foreground))"
                          opacity={0.2}
                        />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="card glass">
                <CardHeader>
                  <CardTitle>Format Distribution</CardTitle>
                  <CardDescription>Breakdown of output formats</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill="hsl(var(--primary))"
                            opacity={1 - index * 0.25}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </PageTransition>
        </TabsContent>

        <TabsContent value="batch">
          <PageTransition className="space-y-6">
            <Card className="card glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Batch Image to Coloring Book
                  <Tooltip content="Upload multiple images to convert them into a single KDP-formatted coloring book PDF.">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </Tooltip>
                </CardTitle>
                <CardDescription>Process multiple images into one KDP-ready PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trim Size</label>
                    <select
                      value={batchTrimSize}
                      onChange={(e) => setBatchTrimSize(e.target.value)}
                      className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="6x9">6 x 9 in</option>
                      <option value="8.5x11">8.5 x 11 in</option>
                      <option value="5.5x8.5">5.5 x 8.5 in</option>
                    </select>
                  </div>
                </div>
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground mb-2">Drag & drop multiple images here</p>
                  <p className="text-xs text-muted-foreground mb-4">Supports JPG, PNG</p>
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleBatchConvert(Array.from(e.target.files || []))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={batchProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Processing {processedCount} of {totalFiles} files...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageTransition>
        </TabsContent>

        <TabsContent value="settings">
          <PageTransition className="max-w-2xl mx-auto space-y-6">
            <Card className="card glass">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input value={user?.email || ''} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API access</label>
                  <p className="text-sm text-muted-foreground">
                    Personal API keys are not available yet. Authenticated dashboard sessions use your
                    Supabase token via the proxied <code>/api</code> routes.
                  </p>
                  <Button variant="outline" disabled>
                    Coming soon
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card glass border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Account deletion is not wired yet. Contact support to remove your data.
                </p>
                <Button variant="destructive" className="w-full sm:w-auto" disabled>
                  Delete Account & Data (coming soon)
                </Button>
              </CardContent>
            </Card>
          </PageTransition>
        </TabsContent>
      </Tabs>
    </div>
  )
}
