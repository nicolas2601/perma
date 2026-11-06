import { useState } from 'react';
import { Tabs, type TabItem } from '@/ui';
import { useNavigate, useSearch } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { ScreenHeader } from './Chrome';
import { useObjectUrl } from './useImageSource';
import { useResultGuard } from './guards';
import { ImagePanel, ObservationsPanel, OutputPanel } from './ViewerPanels';
import { ToolSheet, type ToolName } from './ToolSheet';
import { parseTab } from './viewerTab';

export default function ViewerScreen() {
  const t = useT('inspect');
  const navigate = useNavigate();
  const search = useSearch();
  const image = useExam((state) => state.image);
  const record = useExam((state) => state.record);
  const result = useResultGuard();
  const { locale } = useI18n();
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
      panel: <OutputPanel result={result} locale={locale} />,
    },
    {
      value: 'observaciones',
      label: t('tabObservations'),
      panel: <ObservationsPanel record={record} />,
    },
  ];
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('viewerTitle')} backTo="/resultado" backLabel={t('back')} infoLabel={t('info')} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
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
