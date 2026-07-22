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
import { toast } from 'sonner'
import { subscriptionApi, analyticsApi, pdfApi, templateApi } from '@/lib/api'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { BatchFileQueue } from '@/components/batch/BatchFileQueue'
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
import { FormField } from '@/components/FormField'
import { Tooltip } from '@/components/Tooltip'
import { PageTransition } from '@/components/animations/PageTransition'
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip'
import { KdpSafeZoneOverlay } from '@/components/KdpSafeZoneOverlay'
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

const asArray = (value) => (Array.isArray(value) ? value : [])

const EMPTY_METRICS = {
  daily_activity: [],
  file_types: {},
  storage_used_mb: 0,
  total_conversions: 0,
  total_batch_operations: 0,
}

const normalizeMetrics = (payload) => {
  const raw = payload?.metrics ?? payload
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_METRICS }
  }

  const fileTypes =
    raw.file_types && typeof raw.file_types === 'object' && !Array.isArray(raw.file_types)
      ? raw.file_types
      : {}

  return {
    ...EMPTY_METRICS,
    ...raw,
    daily_activity: asArray(raw.daily_activity),
    file_types: fileTypes,
    storage_used_mb: Number(raw.storage_used_mb) || 0,
    total_conversions: Number(raw.total_conversions) || 0,
    total_batch_operations: Number(raw.total_batch_operations) || 0,
  }
}

const normalizeSubscription = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }
  if (!payload.tier_details) {
    return null
  }
  return payload
}

export default function DashboardContent({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewMeta, setPreviewMeta] = useState({ trimSize: '6x9', withBleed: true })
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
  const [batchFiles, setBatchFiles] = useState([])
  const [coverTitle, setCoverTitle] = useState('')
  const [generateCover, setGenerateCover] = useState(false)
  const [libraryTemplates, setLibraryTemplates] = useState([])

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
    templateApi.getLibrary().then((res) => {
      const payload = res.data?.data?.templates ?? res.data?.templates ?? []
      setLibraryTemplates(payload)
    }).catch(() => setLibraryTemplates([]))
  }, [])

  const deleteTemplate = async (id) => {
    await templateApi.delete(id)
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const refreshMetrics = async () => {
    const metricsRes = await analyticsApi.getUserMetrics()
    const payload = unwrapOk(metricsRes)
    setMetrics(normalizeMetrics(payload))
  }

  const reorderBatchFiles = (fromIndex, toIndex) => {
    setBatchFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const handleBatchFileSelect = (files) => {
    if (!files?.length) return
    setBatchFiles((prev) => [...prev, ...files])
  }

  const handleBatchConvert = async () => {
    if (!batchFiles.length) return
    try {
      setIsProcessing(true)
      setBatchProgress(0)
      setProcessedCount(0)
      setTotalFiles(batchFiles.length)
      setPreviewImage(null)
      setResultData(null)
      setResultType('pdf')

      await trackEvent(AnalyticsEvents.BATCH_PROCESSING_INITIATED, {
        file_count: batchFiles.length,
        trim_size: batchTrimSize,
        generate_cover: generateCover,
      })

      const formData = new FormData()
      const fileOrder = []
      batchFiles.forEach((file, index) => {
        const key = `file_${index}`
        formData.append(key, file)
        fileOrder.push(key)
      })
      formData.append('file_order', JSON.stringify(fileOrder))
      formData.append('trim_size', batchTrimSize)
      if (generateCover && coverTitle.trim()) {
        formData.append('generate_cover', 'true')
        formData.append('cover_title', coverTitle.trim())
      }

      const response = await pdfApi.convertColoringBatch(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setPreviewMeta({ trimSize: batchTrimSize, withBleed: true })
      setResultData(data.download_url)
      setResultType('pdf')
      setBatchProgress(100)
      setProcessedCount(batchFiles.length)
      await refreshMetrics()
      toast.success('Batch conversion complete')
    } catch (error) {
      console.error('Batch conversion failed', error)
      toast.error(error.message || 'Batch conversion failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImageConvert = async (file) => {
    if (!file) return
    const startedAt = Date.now()
    try {
      setIsProcessing(true)
      setPreviewImage(null)
      await trackEvent(AnalyticsEvents.PDF_CONVERSION_STARTED, {
        format: 'coloring',
        file_size: file.size,
        trim_size: coloringTrimSize,
      })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('trim_size', coloringTrimSize)

      const response = await pdfApi.convertColoring(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setPreviewMeta({ trimSize: coloringTrimSize, withBleed: true })
      setResultData(data.download_url)
      setResultType('image')
      await trackEvent(AnalyticsEvents.PDF_CONVERSION_COMPLETED, {
        format: 'coloring',
        success: true,
        processing_time_ms: Date.now() - startedAt,
      })
      await refreshMetrics()
      toast.success('Coloring conversion complete')
    } catch (error) {
      await trackEvent(AnalyticsEvents.PDF_CONVERSION_COMPLETED, {
        format: 'coloring',
        success: false,
        processing_time_ms: Date.now() - startedAt,
      })
      console.error('Coloring conversion failed', error)
      toast.error(error.message || 'Coloring conversion failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePdfProcess = async (file) => {
    if (!file) return
    const startedAt = Date.now()
    try {
      setIsProcessing(true)
      setPreviewImage(null)
      setResultType('pdf')

      await trackEvent(AnalyticsEvents.PDF_CONVERSION_STARTED, {
        format: targetFormat,
        file_size: file.size,
        trim_size: trimSize,
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('trim_size', trimSize)
      formData.append('target_format', targetFormat)

      const response = await pdfApi.convertToKdp(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setPreviewMeta({
        trimSize,
        withBleed: targetFormat === 'kdp-print',
      })
      setResultData(data.download_url)
      await trackEvent(AnalyticsEvents.PDF_CONVERSION_COMPLETED, {
        format: targetFormat,
        success: true,
        processing_time_ms: Date.now() - startedAt,
      })
      await refreshMetrics()
      toast.success('PDF processing complete')
    } catch (error) {
      await trackEvent(AnalyticsEvents.PDF_CONVERSION_COMPLETED, {
        format: targetFormat,
        success: false,
        processing_time_ms: Date.now() - startedAt,
      })
      console.error('PDF processing failed', error)
      toast.error(error.message || 'PDF processing failed')
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
      const subPayload = normalizeSubscription(unwrapOk(subRes))
      const metricsPayload = normalizeMetrics(unwrapOk(metricsRes))
      if (!subPayload) {
        throw new Error('Subscription data could not be loaded')
      }
      setSubscription(subPayload)
      setMetrics(metricsPayload)
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

  if (loadError || !subscription) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Dashboard unavailable
            </CardTitle>
            <CardDescription>
              {loadError || 'Subscription data could not be loaded.'}
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

  const resolvedMetrics = metrics ?? EMPTY_METRICS

  const dailyActivity = asArray(resolvedMetrics.daily_activity)
  const dailyChartData = dailyActivity.slice(-7).map((day) => ({
    name: typeof day?.date === 'string' ? (day.date.slice(5) || day.date) : String(day?.date ?? ''),
    value: Number(day?.conversions || 0) + Number(day?.batch_ops || 0),
  }))

  const fileTypeEntries = Object.entries(
    resolvedMetrics.file_types && typeof resolvedMetrics.file_types === 'object' && !Array.isArray(resolvedMetrics.file_types)
      ? resolvedMetrics.file_types
      : {}
  )
  const pieData = fileTypeEntries.map(([name, value]) => ({ name, value: Number(value) || 0 }))
  const hasFileTypeData = pieData.length > 0
  const successEvents = dailyActivity.reduce(
    (sum, day) => sum + Number(day?.conversions || 0) + Number(day?.batch_ops || 0),
    0
  )
  const hasAnalyticsActivity = successEvents > 0 || resolvedMetrics.total_conversions > 0

  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <div className="glass flex items-center justify-between mb-8 rounded-xl p-4 sticky top-0 z-10">
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
          <TabsTrigger value="templates" className="rounded-lg">Templates</TabsTrigger>
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
                <div className="text-2xl font-bold">{resolvedMetrics.total_conversions || 0}</div>
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
                  {Number(resolvedMetrics.storage_used_mb || 0).toFixed(1)} MB
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cloud asset storage</p>
              </CardContent>
            </Card>
          </PageTransition>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Recent Projects</h2>
            {templates.length === 0 ? (
              <EmptyState
                icon={EmptyProjectsIllustration}
                title="No projects yet"
                description="Create your first KDP project to start optimizing your publishing workflow."
                action={() => setActiveTab('tools')}
                actionLabel="Create Project"
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
                    shouldShow={shouldShowTooltip('pdf-upload-tooltip')}
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
                  <OnboardingTooltip
                    content="Upload JPG or PNG images to convert into KDP-ready coloring pages."
                    tooltipId="image-upload-tooltip"
                    shouldShow={shouldShowTooltip('image-upload-tooltip')}
                    onDismiss={() => dismissTooltip('image-upload-tooltip')}
                    position="top"
                  >
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
                  </OnboardingTooltip>
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
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                    <img
                      src={
                        previewImage.startsWith('http') || previewImage.startsWith('data:')
                          ? previewImage
                          : `data:image/jpeg;base64,${previewImage}`
                      }
                      alt="Preview"
                      className="max-h-full max-w-full object-contain relative z-0"
                    />
                    <KdpSafeZoneOverlay
                      trimSize={previewMeta.trimSize}
                      withBleed={previewMeta.withBleed}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Blue = trim line · Dashed amber = bleed · Green = safe margin (keep text/art inside)
                  </p>
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
            {/*
              Manual seed (optional): run urgent/supabase_seed_script.sql in Supabase SQL Editor.
              See urgent/supabase_seed_instructions.md — replace user_id with your auth.users id.
            */}
            <p className="text-sm text-muted-foreground">
              Live metrics from your last 30 days of processing activity.
            </p>
            {!hasAnalyticsActivity && (
              <p className="text-xs text-muted-foreground border border-dashed rounded-lg px-3 py-2 bg-muted/30">
                No events recorded yet. Conversions populate automatically, or seed historical data via{' '}
                <code className="text-xs">urgent/supabase_seed_script.sql</code> in the Supabase SQL Editor
                (see <code className="text-xs">urgent/supabase_seed_instructions.md</code>).
              </p>
            )}
            <OnboardingTooltip
              content="Track conversions, batch ops, and format breakdown from live analytics events."
              tooltipId="analytics-overview-tooltip"
              shouldShow={shouldShowTooltip('analytics-overview-tooltip')}
              onDismiss={() => dismissTooltip('analytics-overview-tooltip')}
              position="bottom"
            >
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
                  <div className="text-3xl font-bold">{resolvedMetrics.total_conversions || 0}</div>
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
                  <div className="text-3xl font-bold">{resolvedMetrics.total_batch_operations || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">This billing window</p>
                </CardContent>
              </Card>
            </div>
            </OnboardingTooltip>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card glass">
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>Activity over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {dailyChartData.length === 0 || dailyChartData.every((d) => d.value === 0) ? (
                    <EmptyState
                      icon={EmptyAnalyticsIllustration}
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
                  {!hasFileTypeData ? (
                    <EmptyState
                      icon={EmptyAnalyticsIllustration}
                      title="No format data yet"
                      description="Output format breakdown appears after your first conversion."
                    />
                  ) : (
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
                  )}
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
                  <Tooltip content="Upload multiple images, reorder pages, optionally add a title cover, then process into one KDP-ready PDF.">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </Tooltip>
                </CardTitle>
                <CardDescription>Process multiple images into one KDP-ready PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={generateCover}
                        onChange={(e) => setGenerateCover(e.target.checked)}
                        className="rounded"
                      />
                      Add title cover page
                    </label>
                    {generateCover && (
                      <Input
                        placeholder="Book title for cover page"
                        value={coverTitle}
                        onChange={(e) => setCoverTitle(e.target.value)}
                      />
                    )}
                  </div>
                </div>
                <OnboardingTooltip
                  content="Add multiple images, reorder them, then process into one PDF."
                  tooltipId="batch-queue-tooltip"
                  shouldShow={shouldShowTooltip('batch-queue-tooltip')}
                  onDismiss={() => dismissTooltip('batch-queue-tooltip')}
                  position="bottom"
                >
                <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground mb-2">Drag & drop multiple images here</p>
                  <p className="text-xs text-muted-foreground mb-4">Supports JPG, PNG</p>
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => {
                      handleBatchFileSelect(Array.from(e.target.files || []))
                      e.target.value = ''
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                </OnboardingTooltip>
                <BatchFileQueue
                  files={batchFiles}
                  onReorder={reorderBatchFiles}
                  onRemove={(index) => setBatchFiles((prev) => prev.filter((_, i) => i !== index))}
                  onClear={() => setBatchFiles([])}
                />
                <Button
                  onClick={handleBatchConvert}
                  disabled={isProcessing || batchFiles.length === 0}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Process ${batchFiles.length || 0} file(s)`
                  )}
                </Button>
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

        <TabsContent value="templates">
          <PageTransition className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Template Library</h2>
              <p className="text-muted-foreground text-sm">
                Starter KDP templates from niche research — more coming in the 10-week rollout.
                Full plan: <code className="text-xs">web-dashboard/template_library/template_library/template_library_action_plan.md</code>
              </p>
            </div>
            {libraryTemplates.length === 0 ? (
              <EmptyState
                icon={EmptyProjectsIllustration}
                title="No templates available"
                description="Template library is loading or unavailable. Check API connectivity."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {libraryTemplates.map((tpl) => (
                  <Card key={tpl.id} className="card glass">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{tpl.name}</CardTitle>
                        <Badge variant="secondary">{tpl.tier_required}</Badge>
                      </div>
                      <CardDescription>{tpl.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {(tpl.tags || []).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tpl.trim_size} • {tpl.page_count} pages • {tpl.bleed ? 'Bleed' : 'No bleed'}
                      </p>
                      <Button size="sm" className="w-full" onClick={() => setActiveTab('tools')}>
                        Use in Tools
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </PageTransition>
        </TabsContent>

        <TabsContent value="settings">
          <PageTransition className="max-w-2xl mx-auto space-y-6">
            <OnboardingTooltip
              content="Your account email and API preferences live here."
              tooltipId="settings-overview-tooltip"
              shouldShow={shouldShowTooltip('settings-overview-tooltip')}
              onDismiss={() => dismissTooltip('settings-overview-tooltip')}
              position="bottom"
            >
            <Card className="card glass">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  label="Email Address"
                  name="settings-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  helperText="Managed by Supabase Auth"
                />
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
            </OnboardingTooltip>

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
