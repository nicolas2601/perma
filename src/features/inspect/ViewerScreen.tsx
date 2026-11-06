import { useState } from 'react';
import { IconButton, Tabs, type TabItem } from '@/ui';
import { useNavigate, useSearch } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { ScreenHeader } from './Chrome';
import { useObjectUrl } from './useImageSource';
import { useResultGuard } from './guards';
import { ImagePanel, ObservationsPanel, OutputPanel } from './ViewerPanels';
import { ToolSheet, type ToolName } from './ToolSheet';
import { ViewerNav } from './ViewerNav';
import { MoreIcon } from './toolIcons';
import { parseTab } from './viewerTab';

/** Tab labels stay on one line at 390 px: smaller type and no side padding, copy unchanged. */
const TAB_LIST_CLASS = '[&_[role=tab]]:whitespace-nowrap [&_[role=tab]]:px-0 [&_[role=tab]]:text-caption';

export default function ViewerScreen() {
  const t = useT('inspect');
  const navigate = useNavigate();
  const search = useSearch();
  const image = useExam((state) => state.image);
  const record = useExam((state) => state.record);
  const result = useResultGuard();
  const { locale } = useI18n();
  const src = useObjectUrl(image);
  const [tool, setTool] = useState<ToolName>('menu');
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
  const toolsButton = (
    <IconButton label={t('toolsMenuLabel')} onClick={() => openTool('menu')} icon={<MoreIcon />} />
  );
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader
        title={t('viewerTitle')}
        backTo="/resultado"
        backLabel={t('back')}
        infoLabel={t('info')}
        trailing={toolsButton}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-28 pt-2">
        <div className={TAB_LIST_CLASS}>
          <Tabs
            label={t('viewerTabsLabel')}
            items={items}
            value={tab}
            onValueChange={(next) => navigate(`/inspeccion?tab=${next}`, { replace: true })}
          />
        </div>
      </div>
      <ViewerNav />
      <ToolSheet
        open={toolOpen}
        tool={tool}
        image={image}
        onOpenChange={setToolOpen}
        onSelect={setTool}
      />
    </main>
  );
}
