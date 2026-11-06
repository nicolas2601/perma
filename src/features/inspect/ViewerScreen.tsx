import { useState } from 'react';
import { Tabs, type TabItem } from '@/ui';
import { useNavigate, useSearch } from '@/app/router';
import { useExam, useT } from './api';
import { ScreenHeader } from './Chrome';
import { copy } from './copy';
import { useObjectUrl } from './useImageSource';
import { useResultGuard } from './guards';
import { ImagePanel, ObservationsPanel, OutputPanel } from './ViewerPanels';
import { ToolSheet, type ToolName } from './ToolSheet';
import { viewerCopy } from './viewerCopy';

const TABS = ['imagen', 'salida', 'observaciones'] as const;
type TabValue = (typeof TABS)[number];
const DEFAULT_TAB: TabValue = 'imagen';

/** Unknown or missing `tab` values fall back to the image view (edge validation). */
export function parseTab(raw: string | null): TabValue {
  return (TABS as readonly string[]).includes(raw ?? '') ? (raw as TabValue) : DEFAULT_TAB;
}

export default function ViewerScreen() {
  const t = useT(viewerCopy);
  const tCommon = useT(copy);
  const navigate = useNavigate();
  const search = useSearch();
  const { image, record } = useExam();
  const result = useResultGuard();
  const src = useObjectUrl(image);
  const [tool, setTool] = useState<ToolName>('info');
  const [toolOpen, setToolOpen] = useState(false);
  if (!result) return null;
  const tab = parseTab(search.get('tab'));
  const openTool = (next: ToolName) => {
    setTool(next);
    setToolOpen(true);
  };
  const items: TabItem[] = [
    {
      value: 'imagen',
      label: t('tabImage'),
      panel: <ImagePanel src={src} image={image} record={record} onOpenTool={openTool} />,
    },
    {
      value: 'salida',
      label: t('tabOutput'),
      panel: <OutputPanel result={result} />,
    },
    {
      value: 'observaciones',
      label: t('tabObservations'),
      panel: <ObservationsPanel record={record} />,
    },
  ];
  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('viewerTitle')} backTo="/resultado" backLabel={tCommon('back')} infoLabel={tCommon('info')} />
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
        <Tabs
          label={t('viewerTabsLabel')}
          items={items}
          value={tab}
          onValueChange={(next) => navigate(`/inspeccion?tab=${next}`, { replace: true })}
        />
      </div>
      <ToolSheet open={toolOpen} tool={tool} image={image} onOpenChange={setToolOpen} />
    </main>
  );
}
