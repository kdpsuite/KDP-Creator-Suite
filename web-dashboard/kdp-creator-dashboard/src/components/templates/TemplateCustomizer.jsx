import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react'

function FieldControl({ field, value, onChange }) {
  const id = `tpl-field-${field.key}`
  const common = 'w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20'

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="rounded"
        />
        {field.label}
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={id}>{field.label}</label>
        <select
          id={id}
          className={common}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={id}>{field.label}</label>
        <textarea
          id={id}
          className={`${common} min-h-[96px]`}
          value={Array.isArray(value) ? value.join('\n') : (value ?? '')}
          maxLength={field.maxLength}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={id}>{field.label}</label>
        <Input
          id={id}
          type="number"
          value={value ?? ''}
          min={field.min}
          max={field.max}
          step={field.step || 1}
          onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
        />
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>{field.label}</label>
      <Input
        id={id}
        type="text"
        value={value ?? ''}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
    </div>
  )
}

export function TemplateCustomizer({
  template,
  options,
  onChange,
  onGenerate,
  isProcessing,
  result,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const sharedKeys = useMemo(
    () => new Set([
      'title', 'subtitle', 'author', 'trim_size', 'print_profile', 'with_bleed',
      'page_count', 'accent_color', 'back_cover_blurb', 'include_spine_text',
    ]),
    []
  )

  const fields = template?.fields || []
  const primaryFields = fields.filter((f) => sharedKeys.has(f.key))
  const nicheFields = fields.filter((f) => !sharedKeys.has(f.key))

  if (!template) {
    return (
      <Card className="card glass">
        <CardHeader>
          <CardTitle>Product Builder</CardTitle>
          <CardDescription>
            Select a template from the Templates tab to customize and generate a full paperback product.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="card glass border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Product Builder
              <Badge variant="secondary">{template.niche}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Customize <strong>{template.name}</strong>, then generate a print-ready interior PDF and
              full-wrap paperback cover.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {primaryFields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={options[field.key]}
              onChange={onChange}
            />
          ))}
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide' : 'Show'} template options
          </Button>
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4">
              {nicheFields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={options[field.key]}
                  onChange={onChange}
                />
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" disabled={isProcessing} onClick={onGenerate}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating KDP product...
            </>
          ) : (
            'Generate interior + cover'
          )}
        </Button>

        {result && (
          <div
            className={`rounded-lg border p-4 space-y-3 ${
              result.compliance?.is_valid
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {result.compliance?.is_valid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              {result.compliance?.is_valid
                ? 'Preflight passed (verify in KDP Print Previewer)'
                : 'Preflight found issues'}
            </div>
            <p className="text-sm text-muted-foreground">
              {result.page_count} pages · {result.trim_size} · {result.print_profile}
              {result.with_bleed ? ' · bleed' : ' · no bleed'}
            </p>
            <p className="text-sm text-muted-foreground">
              Cover wrap: {result.cover?.width_in?.toFixed?.(3) || result.cover?.width_in}&quot; ×{' '}
              {result.cover?.height_in?.toFixed?.(3) || result.cover?.height_in}&quot;
              {' '}(spine {result.cover?.spine_width_in?.toFixed?.(3)}&quot;)
            </p>
            {(result.compliance?.errors || []).map((err) => (
              <p key={err} className="text-sm text-destructive">{err}</p>
            ))}
            {(result.compliance?.warnings || []).slice(0, 3).map((warn) => (
              <p key={warn} className="text-sm text-amber-700 dark:text-amber-400">{warn}</p>
            ))}
            <div className="flex flex-wrap gap-2">
              {result.interior_download_url && (
                <Button asChild variant="default" size="sm">
                  <a href={result.interior_download_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Interior PDF
                  </a>
                </Button>
              )}
              {result.cover_download_url && (
                <Button asChild variant="outline" size="sm">
                  <a href={result.cover_download_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Cover PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
