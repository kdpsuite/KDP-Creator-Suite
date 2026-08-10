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
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
import { toast } from 'sonner'
import { subscriptionApi, analyticsApi, pdfApi, templateApi, accountApi, getUploadErrorMessage } from '@/lib/api'
import { SUPPORT_EMAIL } from '@/lib/monitoring'
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
import { TemplateCustomizer } from '@/components/templates/TemplateCustomizer'
import { useOnboarding } from '@/hooks/useOnboarding'
import { EmptyProjectsIllustration } from '@/components/illustrations/EmptyProjectsIllustration'
import { EmptyAnalyticsIllustration } from '@/components/illustrations/EmptyAnalyticsIllustration'
import { KDP_TRIM_SIZES } from '@/lib/kdpDimensions'

const TRIM_OPTIONS = Object.keys(KDP_TRIM_SIZES)

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

const BATCH_MAX_UPLOAD_BYTES = 4 * 1024 * 1024

const apiErrorMessage = (error, fallback) => getUploadErrorMessage(error, fallback)

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


const TIER_RANK = { free: 0, pro: 1, studio: 2, unlimited: 3 }

const tierMeetsRequirement = (userTier, requiredTier) =>
  (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0)

const isUpgradeError = (error) => {
  const code = error?.response?.data?.error?.code
  return code === 'QUOTA_EXCEEDED' || code === 'TIER_REQUIRED'
}

export default function DashboardContent({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewMeta, setPreviewMeta] = useState({ trimSize: '6x9', withBleed: true, pageCount: 24 })
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
  const [coloringEnhanced, setColoringEnhanced] = useState(false)
  const [coloringDetailLevel, setColoringDetailLevel] = useState('medium')
  const [coloringContrast, setColoringContrast] = useState(0)
  const [coloringEdgeEnhancement, setColoringEdgeEnhancement] = useState('mild')
  const [coloringAutoThreshold, setColoringAutoThreshold] = useState(true)
  const [coloringThreshold, setColoringThreshold] = useState(127)
  const [batchEnhanced, setBatchEnhanced] = useState(false)
  const [batchDetailLevel, setBatchDetailLevel] = useState('medium')
  const [batchContrast, setBatchContrast] = useState(0)
  const [batchEdgeEnhancement, setBatchEdgeEnhancement] = useState('mild')
  const [batchAutoThreshold, setBatchAutoThreshold] = useState(true)
  const [batchThreshold, setBatchThreshold] = useState(127)
  const [batchFiles, setBatchFiles] = useState([])
  const [batchFailed, setBatchFailed] = useState(false)
  const [coverTitle, setCoverTitle] = useState('')
  const [generateCover, setGenerateCover] = useState(false)
  const [libraryTemplates, setLibraryTemplates] = useState([])
  const [pendingPdfFile, setPendingPdfFile] = useState(null)
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [pendingValidateFile, setPendingValidateFile] = useState(null)
  const [validateTrimSize, setValidateTrimSize] = useState('6x9')
  const [validationResult, setValidationResult] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateOptions, setTemplateOptions] = useState({})
  const [productResult, setProductResult] = useState(null)

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

  const promptUpgrade = (message) => {
    toast.error(message || 'Upgrade required to continue', {
      action: {
        label: 'View plans',
        onClick: () => setActiveTab('overview'),
      },
    })
    setActiveTab('overview')
  }

  const handleCheckout = async (tier) => {
    try {
      setCheckoutLoading(tier)
      const res = await subscriptionApi.createCheckout(tier)
      const data = unwrapOk(res)
      if (!data?.checkout_url) {
        throw new Error('Checkout URL missing')
      }
      await trackEvent(AnalyticsEvents.SUBSCRIPTION_UPGRADED, { tier, stage: 'checkout_started' })
      window.location.assign(data.checkout_url)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Unable to start checkout'))
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleBillingPortal = async () => {
    try {
      const res = await subscriptionApi.openBillingPortal()
      const data = unwrapOk(res)
      if (!data?.portal_url) {
        throw new Error('Billing portal URL missing')
      }
      window.location.assign(data.portal_url)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Unable to open billing portal'))
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Permanently delete your account and profile data? This cannot be undone.'
    )
    if (!confirmed) return
    try {
      setIsDeletingAccount(true)
      await accountApi.deleteAccount()
      toast.success('Account deleted')
      await handleLogout()
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Account deletion failed'))
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const applyTemplate = (tpl) => {
    const required = (tpl.tier_required || 'free').toLowerCase()
    const currentTier = (subscription?.tier || 'free').toLowerCase()
    if (!tierMeetsRequirement(currentTier, required)) {
      promptUpgrade(`"${tpl.name}" requires the ${required} plan.`)
      return
    }
    const next = {
      ...(tpl.defaults || {}),
      trim_size: tpl.trim_size || tpl.defaults?.trim_size || '6x9',
      page_count: tpl.page_count || tpl.defaults?.page_count || 24,
      with_bleed: typeof tpl.defaults?.with_bleed === 'boolean' ? tpl.defaults.with_bleed : Boolean(tpl.bleed),
    }
    setSelectedTemplate(tpl)
    setTemplateOptions(next)
    setProductResult(null)
    const trim = next.trim_size || '6x9'
    setTrimSize(trim)
    setColoringTrimSize(trim)
    setBatchTrimSize(trim)
    setValidateTrimSize(trim)
    setActiveTab('tools')
    toast.success(`Loaded "${tpl.name}" in Product Builder`)
  }

  const updateTemplateOption = (key, value) => {
    setTemplateOptions((prev) => ({ ...prev, [key]: value }))
  }

  const notifyApiError = (error, fallback) => {
    const message = apiErrorMessage(error, fallback)
    if (isUpgradeError(error)) {
      promptUpgrade(message)
      return
    }
    toast.error(message)
  }


  const handleGenerateProduct = async () => {
    if (!selectedTemplate?.id) return
    try {
      setIsProcessing(true)
      setProductResult(null)
      const response = await templateApi.generate(selectedTemplate.id, templateOptions)
      const data = unwrapOk(response)
      setProductResult(data)
      if (data?.preview) {
        setPreviewImage(data.preview)
        setPreviewMeta({
          trimSize: data.trim_size || templateOptions.trim_size || '6x9',
          withBleed: Boolean(data.with_bleed),
          pageCount: data.page_count || 24,
        })
        setResultType('pdf')
        setResultData(data.interior_download_url)
      }
      await refreshMetrics()
      if (data?.compliance?.is_valid) {
        toast.success('Product generated — download interior and cover')
      } else {
        toast.warning('Generated with preflight warnings — review compliance report')
      }
    } catch (error) {
      console.error('Template generation failed', error)
      notifyApiError(error, 'Template generation failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchConvert = async () => {
    if (!batchFiles.length) return
    const totalBytes = batchFiles.reduce((sum, f) => sum + (f.size || 0), 0)
    if (totalBytes > BATCH_MAX_UPLOAD_BYTES) {
      toast.error(
        `Batch is ${(totalBytes / (1024 * 1024)).toFixed(1)} MB. Keep total under 4 MB (fewer/smaller images) or split into multiple runs.`
      )
      return
    }
    try {
      setIsProcessing(true)
      setBatchFailed(false)
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
      if (batchEnhanced) {
        formData.append('engine', 'enhanced')
        formData.append('detail_level', batchDetailLevel)
        formData.append('contrast', String(batchContrast))
        formData.append('edge_enhancement', batchEdgeEnhancement)
        formData.append('threshold', batchAutoThreshold ? 'auto' : String(batchThreshold))
      } else {
        formData.append('engine', 'legacy')
      }
      if (generateCover && coverTitle.trim()) {
        formData.append('generate_cover', 'true')
        formData.append('cover_title', coverTitle.trim())
      }

      const response = await pdfApi.convertColoringBatch(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setPreviewMeta({ trimSize: batchTrimSize, withBleed: true, pageCount: data.page_count || 24 })
      setResultData(data.download_url)
      setResultType('pdf')
      setBatchProgress(100)
      setProcessedCount(batchFiles.length)
      await refreshMetrics()
      toast.success('Batch conversion complete')
    } catch (error) {
      console.error('Batch conversion failed', error)
      setBatchProgress(0)
      setProcessedCount(0)
      setPreviewImage(null)
      setResultData(null)
      setBatchFailed(true)
      notifyApiError(error, 'Batch conversion failed')
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
      if (coloringEnhanced) {
        formData.append('engine', 'enhanced')
        formData.append('detail_level', coloringDetailLevel)
        formData.append('contrast', String(coloringContrast))
        formData.append('edge_enhancement', coloringEdgeEnhancement)
        formData.append('threshold', coloringAutoThreshold ? 'auto' : String(coloringThreshold))
      } else {
        formData.append('engine', 'legacy')
      }

      const response = await pdfApi.convertColoring(formData)
      const data = unwrapOk(response)
      setPreviewImage(data.preview)
      setPreviewMeta({ trimSize: coloringTrimSize, withBleed: true, pageCount: 24 })
      setResultData(data.download_url)
      setResultType(data.format === 'PDF' ? 'pdf' : 'image')
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
      notifyApiError(error, 'Coloring conversion failed')
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
        pageCount: data.page_count || 24,
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
      notifyApiError(error, 'PDF processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleValidatePdf = async (file) => {
    if (!file) return
    try {
      setIsProcessing(true)
      setValidationResult(null)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('trim_size', validateTrimSize)
      formData.append('target_format', 'print')
      const response = await pdfApi.validateCompliance(formData)
      const data = unwrapOk(response)
      setValidationResult(data)
      if (data?.is_valid) {
        toast.success(data.message || 'PDF meets KDP size checks')
      } else {
        toast.warning(data?.warnings?.[0] || data?.message || 'PDF has validation warnings')
      }
    } catch (error) {
      console.error('KDP validation failed', error)
      toast.error(apiErrorMessage(error, 'KDP validation failed'))
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
      const subRes = await subscriptionApi.getStatus()
      const subPayload = normalizeSubscription(unwrapOk(subRes))
      if (!subPayload) {
        throw new Error('Subscription data could not be loaded')
      }
      setSubscription(subPayload)

      try {
        const metricsRes = await analyticsApi.getUserMetrics()
        setMetrics(normalizeMetrics(unwrapOk(metricsRes)))
      } catch (metricsError) {
        console.warn('Failed to load metrics; continuing with empty metrics', metricsError)
        setMetrics({ ...EMPTY_METRICS })
      }
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const tab = params.get('tab')
    if (tab === 'settings' || tab === 'overview' || tab === 'templates') {
      setActiveTab(tab)
    }
    if (checkout === 'success') {
      toast.success('Payment received — refreshing your plan')
      trackEvent(AnalyticsEvents.SUBSCRIPTION_UPGRADED, {
        tier: params.get('tier') || 'unknown',
        stage: 'checkout_success',
      })
      loadDashboardData()
      params.delete('checkout')
      params.delete('tier')
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
      window.history.replaceState({}, '', next)
    } else if (checkout === 'canceled') {
      toast.message('Checkout canceled')
      params.delete('checkout')
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
      window.history.replaceState({}, '', next)
    }
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
                {(subscription?.tier === 'free' || !subscription?.tier) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={checkoutLoading === 'pro'}
                      onClick={() => handleCheckout('pro')}
                    >
                      {checkoutLoading === 'pro' ? 'Redirecting…' : 'Upgrade to Pro'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={checkoutLoading === 'studio'}
                      onClick={() => handleCheckout('studio')}
                    >
                      {checkoutLoading === 'studio' ? 'Redirecting…' : 'Upgrade to Studio'}
                    </Button>
                  </div>
                )}
                {subscription?.billing?.has_customer && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 px-0"
                    onClick={handleBillingPortal}
                  >
                    Manage billing
                  </Button>
                )}
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

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card glass">
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>$0 / month</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>5 conversions / month</p>
                <p>1 batch job / month</p>
                <Badge variant="secondary">{subscription?.tier === 'free' ? 'Current plan' : 'Included'}</Badge>
              </CardContent>
            </Card>
            <Card className="card glass border-primary/30">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>$19.99 / month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Unlimited conversions · 10 batch jobs · Pro templates</p>
                <Button
                  className="w-full"
                  disabled={subscription?.tier === 'pro' || checkoutLoading === 'pro'}
                  onClick={() => handleCheckout('pro')}
                >
                  {subscription?.tier === 'pro' ? 'Current plan' : checkoutLoading === 'pro' ? 'Redirecting…' : 'Choose Pro'}
                </Button>
              </CardContent>
            </Card>
            <Card className="card glass">
              <CardHeader>
                <CardTitle>Studio</CardTitle>
                <CardDescription>$49.99 / month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Unlimited conversions & batch · priority support</p>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={subscription?.tier === 'studio' || checkoutLoading === 'studio'}
                  onClick={() => handleCheckout('studio')}
                >
                  {subscription?.tier === 'studio' ? 'Current plan' : checkoutLoading === 'studio' ? 'Redirecting…' : 'Choose Studio'}
                </Button>
              </CardContent>
            </Card>
          </div>

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
            <TemplateCustomizer
              template={selectedTemplate}
              options={templateOptions}
              onChange={updateTemplateOption}
              onGenerate={handleGenerateProduct}
              isProcessing={isProcessing}
              result={productResult}
            />

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
                        {TRIM_OPTIONS.map((size) => (
                          <option key={size} value={size}>{size.replace('x', ' × ')} in</option>
                        ))}
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
                      <p className="text-sm text-muted-foreground mb-2">
                        {pendingPdfFile?.name || 'Drag & drop your PDF here'}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {pendingPdfFile ? 'Click to choose a different PDF' : 'or click to browse'}
                      </p>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setPendingPdfFile(file)
                          e.target.value = ''
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!pendingPdfFile || isProcessing}
                      onClick={() => pendingPdfFile && handlePdfProcess(pendingPdfFile)}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        'Convert PDF'
                      )}
                    </Button>
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
                        {TRIM_OPTIONS.map((size) => (
                          <option key={size} value={size}>{size.replace('x', ' × ')} in</option>
                        ))}
                      </select>
                    </div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={coloringEnhanced}
                        onChange={(e) => setColoringEnhanced(e.target.checked)}
                        className="rounded"
                      />
                      Enhanced line art
                    </label>
                    {coloringEnhanced && (
                      <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Detail</label>
                          <select
                            value={coloringDetailLevel}
                            onChange={(e) => setColoringDetailLevel(e.target.value)}
                            className="w-full p-2 rounded-md border bg-background"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Contrast ({coloringContrast})</label>
                          <input
                            type="range"
                            min={-50}
                            max={50}
                            value={coloringContrast}
                            onChange={(e) => setColoringContrast(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Edge enhancement</label>
                          <select
                            value={coloringEdgeEnhancement}
                            onChange={(e) => setColoringEdgeEnhancement(e.target.value)}
                            className="w-full p-2 rounded-md border bg-background"
                          >
                            <option value="off">Off</option>
                            <option value="mild">Mild</option>
                            <option value="strong">Strong</option>
                          </select>
                        </div>
                        <label className="text-sm font-medium flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={coloringAutoThreshold}
                            onChange={(e) => setColoringAutoThreshold(e.target.checked)}
                            className="rounded"
                          />
                          Auto threshold
                        </label>
                        {!coloringAutoThreshold && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Threshold ({coloringThreshold})</label>
                            <input
                              type="range"
                              min={0}
                              max={255}
                              value={coloringThreshold}
                              onChange={(e) => setColoringThreshold(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    )}
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
                      <p className="text-sm text-muted-foreground mb-2">
                        {pendingImageFile?.name || 'Upload image to convert'}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {pendingImageFile ? 'Click to choose a different image' : 'Supports JPG, PNG'}
                      </p>
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setPendingImageFile(file)
                          e.target.value = ''
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!pendingImageFile || isProcessing}
                      onClick={() => pendingImageFile && handleImageConvert(pendingImageFile)}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        'Convert to Coloring Page'
                      )}
                    </Button>
                  </OnboardingTooltip>
                </CardContent>
              </Card>
            </div>

            <Card className="card glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Validate KDP PDF
                  <Tooltip content="Check page count and trim dimensions against KDP print sizes">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </Tooltip>
                </CardTitle>
                <CardDescription>Compliance check without converting the file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trim Size</label>
                    <select
                      value={validateTrimSize}
                      onChange={(e) => setValidateTrimSize(e.target.value)}
                      className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20"
                    >
                      {TRIM_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size.replace('x', ' × ')} in</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 border-2 border-dashed rounded-xl p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                    <FileCheck className="h-7 w-7 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-sm text-muted-foreground">
                      {pendingValidateFile?.name || 'Upload a PDF to validate'}
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setPendingValidateFile(file)
                        setValidationResult(null)
                        e.target.value = ''
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <Button
                  className="w-full md:w-auto"
                  disabled={!pendingValidateFile || isProcessing}
                  onClick={() => pendingValidateFile && handleValidatePdf(pendingValidateFile)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate PDF'
                  )}
                </Button>
                {validationResult && (
                  <div
                    className={`rounded-lg border p-4 text-sm space-y-1 ${
                      validationResult.is_valid
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-amber-500/30 bg-amber-500/5'
                    }`}
                  >
                    <p className="font-medium">
                      {validationResult.is_valid ? 'Valid for selected trim size' : 'Needs attention'}
                    </p>
                    <p className="text-muted-foreground">
                      Pages: {validationResult.num_pages ?? '—'} · PDF:{' '}
                      {validationResult.pdf_dimensions_inches ?? '—'} · Expected:{' '}
                      {validationResult.expected_dimensions_inches ?? '—'}
                    </p>
                    {(validationResult.warnings || []).map((warning) => (
                      <p key={warning} className="text-amber-700 dark:text-amber-400">
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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

            {(previewImage || resultData) && !isProcessing && (
              <Card className="card glass border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Processing Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {previewImage ? (
                    <>
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
                          pageCount={previewMeta.pageCount || 24}
                          pageSide="right"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Blue = trim line · Dashed amber = bleed · Green = safe zone (mirrored gutters by page side)
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Preview unavailable — download is ready
                    </p>
                  )}
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
                      {TRIM_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size.replace('x', ' × ')} in</option>
                      ))}
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
                <label className="text-sm font-medium flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={batchEnhanced}
                    onChange={(e) => setBatchEnhanced(e.target.checked)}
                    className="rounded"
                  />
                  Enhanced line art
                </label>
                {batchEnhanced && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border p-3 bg-muted/30">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Detail</label>
                      <select
                        value={batchDetailLevel}
                        onChange={(e) => setBatchDetailLevel(e.target.value)}
                        className="w-full p-2 rounded-md border bg-background"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Edge enhancement</label>
                      <select
                        value={batchEdgeEnhancement}
                        onChange={(e) => setBatchEdgeEnhancement(e.target.value)}
                        className="w-full p-2 rounded-md border bg-background"
                      >
                        <option value="off">Off</option>
                        <option value="mild">Mild</option>
                        <option value="strong">Strong</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Contrast ({batchContrast})</label>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={batchContrast}
                        onChange={(e) => setBatchContrast(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={batchAutoThreshold}
                        onChange={(e) => setBatchAutoThreshold(e.target.checked)}
                        className="rounded"
                      />
                      Auto threshold
                    </label>
                    {!batchAutoThreshold && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Threshold ({batchThreshold})</label>
                        <input
                          type="range"
                          min={0}
                          max={255}
                          value={batchThreshold}
                          onChange={(e) => setBatchThreshold(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
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
                      {processedCount > 0
                        ? `Processing ${processedCount} of ${totalFiles} files...`
                        : `Uploading and processing ${totalFiles} file(s) on the server...`}
                    </p>
                  </div>
                )}
                {!isProcessing && resultData && (
                  <div className="space-y-4 rounded-lg border border-green-500/20 bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <CheckCircle className="h-5 w-5" />
                      Batch Complete
                    </div>
                    {previewImage ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                        <img
                          src={
                            previewImage.startsWith('http') || previewImage.startsWith('data:')
                              ? previewImage
                              : `data:image/jpeg;base64,${previewImage}`
                          }
                          alt="Batch preview"
                          className="max-h-full max-w-full object-contain relative z-0"
                        />
                        <KdpSafeZoneOverlay
                          trimSize={previewMeta.trimSize}
                          withBleed={previewMeta.withBleed}
                          pageCount={previewMeta.pageCount || 24}
                          pageSide="right"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">
                        Preview unavailable — download is ready
                      </p>
                    )}
                    <div className="flex justify-end gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPreviewImage(null)
                          setResultData(null)
                          setBatchProgress(0)
                          setProcessedCount(0)
                          setBatchFailed(false)
                        }}
                      >
                        Process Another
                      </Button>
                      <Button onClick={downloadResult} className="transition-premium">
                        <Download className="mr-2 h-4 w-4" />
                        Download {resultType === 'pdf' ? 'PDF' : 'Image'}
                      </Button>
                    </div>
                  </div>
                )}
                {!isProcessing && batchFailed && !resultData && (
                  <div className="rounded-lg border border-destructive/30 bg-muted/30 p-4 text-center space-y-2">
                    <p className="text-sm font-medium text-destructive">Batch conversion failed</p>
                    <p className="text-xs text-muted-foreground">
                      Adjust your files and try again. You are still on the Batch tab.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBatchFailed(false)}
                    >
                      Dismiss
                    </Button>
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
                Choose a starter template, customize print options, and generate a KDP-ready interior plus paperback cover.
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
                      <Button
                        size="sm"
                        className="w-full"
                        variant={tierMeetsRequirement((subscription?.tier || 'free').toLowerCase(), (tpl.tier_required || 'free').toLowerCase()) ? 'default' : 'outline'}
                        onClick={() => {
                          applyTemplate(tpl)
                        }}
                      >
                        {tierMeetsRequirement((subscription?.tier || 'free').toLowerCase(), (tpl.tier_required || 'free').toLowerCase())
                          ? 'Customize & Generate'
                          : `Requires ${tpl.tier_required}`}
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
                  <label className="text-sm font-medium">Support</label>
                  <p className="text-sm text-muted-foreground">
                    Need help with billing, quotas, or account access? Email{' '}
                    <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API access</label>
                  <p className="text-sm text-muted-foreground">
                    Personal API keys are not available yet. Authenticated dashboard sessions use your
                    Supabase token via the proxied <code>/api</code> routes.
                  </p>
                </div>
                {subscription?.billing?.has_customer && (
                  <Button variant="outline" onClick={handleBillingPortal}>
                    Manage billing
                  </Button>
                )}
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
                  Deletes your profile and auth account. Local project drafts in this browser are cleared on logout.
                </p>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={isDeletingAccount}
                  onClick={handleDeleteAccount}
                >
                  {isDeletingAccount ? 'Deleting…' : 'Delete Account & Data'}
                </Button>
              </CardContent>
            </Card>
          </PageTransition>
        </TabsContent>
      </Tabs>
    </div>
  )
}
