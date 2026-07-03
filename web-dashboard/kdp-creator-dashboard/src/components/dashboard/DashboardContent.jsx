import { useState, useEffect } from 'react'
import { 
  FileText, 
  Image, 
  Zap, 
  Crown, 
  BarChart3, 
  Settings, 
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  LogOut,
  Loader2,
  Key,
  Moon,
  Sun,
  Save,
  Trash2,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Input } from '@/components/ui/input.jsx'
import { authApi, subscriptionApi, analyticsApi, pdfApi, totpApi, batchApi, templateApi } from '@/lib/api'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'

// Phase 1-3 Components
import { SkeletonLoader } from '@/components/SkeletonLoader'
import { EmptyState } from '@/components/EmptyState'
import { Tooltip } from '@/components/Tooltip'
import { PageTransition } from '@/components/animations/PageTransition'
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip'
import { useOnboarding } from '@/hooks/useOnboarding'
import { EmptyProjectsIllustration } from '@/components/illustrations/EmptyProjectsIllustration'
import { EmptyAnalyticsIllustration } from '@/components/illustrations/EmptyAnalyticsIllustration'

import * as pdfjs from 'pdfjs-dist'
import 'pdfjs-dist/build/pdf.worker.min.mjs'

pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'

export default function DashboardContent({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [resultType, setResultType] = useState('image')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kdp_dark_mode') === 'true')
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('kdp_dark_mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    templateApi.getAll().then(res => setTemplates(res.data.templates))
  }, [])

  const saveTemplate = async (name, trimSize, bleed) => {
    await templateApi.save({ name, trim_size: trimSize, bleed })
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const deleteTemplate = async (id) => {
    await templateApi.delete(id)
    const res = await templateApi.getAll()
    setTemplates(res.data.templates)
  }

  const handleImageConvert = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('user_id', user.id);
      
      const response = await pdfApi.convertImage(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.image_data);
        setResultType('image');
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('Conversion failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const KDP_TRIM_SIZES = {
    '6x9': { width: 6, height: 9 },
    '8.5x11': { width: 8.5, height: 11 },
    '5.5x8.5': { width: 5.5, height: 8.5 },
  };
  const BLEED_SIZE = 0.125;

  const validatePdfDimensions = async (file, trimSize, targetFormat) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    const pdfWidth = viewport.width / 72; // Convert points to inches
    const pdfHeight = viewport.height / 72; // Convert points to inches

    let expectedWidth = KDP_TRIM_SIZES[trimSize].width;
    let expectedHeight = KDP_TRIM_SIZES[trimSize].height;

    if (targetFormat === 'kdp-print') { // Assuming 'kdp-print' implies bleed
      expectedWidth += BLEED_SIZE;
      expectedHeight += BLEED_SIZE * 2; // Top and bottom bleed
    }

    const dimensionMatch = (
      Math.abs(pdfWidth - expectedWidth) < 0.05 &&
      Math.abs(pdfHeight - expectedHeight) < 0.05
    );

    if (!dimensionMatch) {
      return `Dimension mismatch. Expected ${expectedWidth.toFixed(2)}x${expectedHeight.toFixed(2)} inches, got ${pdfWidth.toFixed(2)}x${pdfHeight.toFixed(2)} inches.`;
    }
    return null; // No error
  };

  const handlePdfProcess = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setPreviewImage(null);
      setResultType('pdf');

      const trimSize = document.getElementById('trim-size').value;
      const targetFormat = document.getElementById('target-format').value;

      const validationError = await validatePdfDimensions(file, trimSize, targetFormat);
      if (validationError) {
        alert(`PDF Validation Error: ${validationError}`);
        return;
      }

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('user_id', user.id);
      formData.append('trim_size', trimSize);
      formData.append('target_format', targetFormat);
      
      const response = await pdfApi.convertToKdp(formData);
      if (response.data.success) {
        setPreviewImage(response.data.preview);
        setResultData(response.data.pdf_data);
        const metricsRes = await analyticsApi.getUserMetrics();
        setMetrics(metricsRes.data.metrics);
      }
    } catch (error) {
      console.error('PDF processing failed', error);
      alert(`PDF Processing Error: ${error.message || 'An unknown error occurred.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultData) return;
    const link = document.createElement('a');
    const mime = resultType === 'pdf' ? 'application/pdf' : 'image/png';
    const ext = resultType === 'pdf' ? 'pdf' : 'png';
    link.href = `data:${mime};base64,${resultData}`;
    link.download = `kdp_conversion_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [subRes, metricsRes] = await Promise.all([
          subscriptionApi.getStatus(),
          analyticsApi.getUserMetrics()
        ])
        setSubscription(subRes.data.data)
        setMetrics(metricsRes.data.data.metrics)
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading || !subscription || !metrics) {
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

  const { tier, tier_details, current_usage, remaining_usage } = subscription
  const conversionsUsed = current_usage?.conversions ?? current_usage ?? 0
  const conversionsLimit = tier_details?.monthly_conversions ?? tier_details?.limits?.conversions_per_month ?? 0

  const { shouldShowTooltip, dismissTooltip } = useOnboarding()
  
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
                  <div className="text-2xl font-bold">{tier_details.name}</div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {remaining_usage} left
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Monthly Usage</span>
                    <span>{conversionsUsed} / {conversionsLimit === -1 ? 'Unlimited' : conversionsLimit}</span>
                  </div>
                  <Progress value={conversionsLimit === -1 ? 100 : (conversionsUsed / conversionsLimit) * 100} className="h-2" />
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
                <p className="text-xs text-muted-foreground mt-1">
                  Across all formats
                </p>
              </CardContent>
            </Card>

            <Card className="card glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics.storage_used_mb || 0).toFixed(1)} MB</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cloud asset storage
                </p>
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
                action={{ label: "Create Project", onClick: () => setActiveTab('tools') }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(t => (
                  <Card key={t.id} className="card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <CardDescription>{t.trim_size} • {t.bleed ? 'Bleed' : 'No Bleed'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} className="text-destructive hover:bg-destructive/10">
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
                      <select id="trim-size" className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20">
                        <option value="6x9">6 x 9 in</option>
                        <option value="8.5x11">8.5 x 11 in</option>
                        <option value="5.5x8.5">5.5 x 8.5 in</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Format</label>
                      <select id="target-format" className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20">
                        <option value="kdp-standard">KDP Standard</option>
                        <option value="kdp-premium">KDP Premium</option>
                      </select>
                    </div>
                  </div>
                  <OnboardingTooltip
                    tooltipId="pdf-upload"
                    content="Upload your interior PDF here to start the conversion"
                    position="top"
                    shouldShow={shouldShowTooltip('pdf-upload')}
                    onDismiss={dismissTooltip}
                  >
                    <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:border-primary/50">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => handlePdfProcess(e.target.files[0])}
                        className="hidden" 
                        id="pdf-upload-input" 
                      />
                      <label htmlFor="pdf-upload-input" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="font-medium">Click to upload PDF</p>
                        <p className="text-xs text-muted-foreground mt-1">Max file size: 50MB</p>
                      </label>
                    </div>
                  </OnboardingTooltip>
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Processing PDF...</span>
                        <span>{Math.round(45)}%</span>
                      </div>
                      <Progress value={45} className="h-1 animate-pulse" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card glass">
                <CardHeader>
                  <CardTitle>Result Preview</CardTitle>
                  <CardDescription>Verify your file before downloading</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
                  {previewImage ? (
                    <div className="space-y-4 w-full">
                      <div className="relative aspect-[3/4] w-full max-w-[200px] mx-auto shadow-2xl rounded-lg overflow-hidden border">
                        <img src={`data:image/png;base64,${previewImage}`} alt="Preview" className="object-cover w-full h-full" />
                      </div>
                      <Button onClick={downloadResult} className="w-full gradient-primary">
                        <Download className="mr-2 h-4 w-4" /> Download {resultType.toUpperCase()}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No preview available</p>
                      <p className="text-xs">Upload a file to see preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </PageTransition>
        </TabsContent>

        <TabsContent value="analytics">
          <PageTransition className="space-y-6">
            <Card className="card glass">
              <CardHeader>
                <CardTitle>Conversion Performance</CardTitle>
                <CardDescription>Daily conversion volume and success rate</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {metrics.daily_stats && metrics.daily_stats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.daily_stats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border))" />
                      <XAxis dataKey="date" stroke="oklch(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="oklch(var(--muted-foreground))" fontSize={12} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'oklch(var(--card))', border: '1px solid oklch(var(--border))', borderRadius: '8px' }}
                      />
                      <Bar dataKey="conversions" fill="oklch(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    icon={<EmptyAnalyticsIllustration />}
                    title="No analytics data"
                    description="Perform some conversions to see your performance metrics here."
                  />
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
                <CardDescription>Manage your profile and security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input value={user.email} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">User ID</label>
                  <div className="flex gap-2">
                    <Input value={user.id} disabled className="font-mono text-xs bg-muted/50" />
                    <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(user.id)}>
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PageTransition>
        </TabsContent>
      </Tabs>
    </div>
  )
}
