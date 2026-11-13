import { useT } from '@/core/i18n/I18nProvider';
import { ArrowUpRightIcon, PlusIcon } from '@/ui/icons';
import heroArt from '@/assets/art/hero-skin-field.svg';
import markDark from '@/assets/art/mark-attention-dark.svg';

export type HomeHeroProps = {
  onNewExam: () => void;
  onReference: () => void;
};

const PILL =
  'min-h-12 cursor-pointer items-center gap-2.5 rounded-full px-5.5 text-[15px] leading-5 font-medium outline-offset-2 focus-visible:outline-papel transition-transform duration-(--motion-press) ease-perma-out active:scale-[0.97] motion-reduce:active:scale-100';

/** Brand hero: the attention V and wordmark, the lead, the entry actions and the skin-field art (decorative). */
export function HomeHero({ onNewExam, onReference }: HomeHeroProps) {
  const t = useT('desk');
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative overflow-hidden rounded-3xl [background:var(--hero-gradient-mobile)] lg:min-h-100 lg:[background:var(--hero-gradient)]"
    >
      <div className="relative z-10 flex flex-col gap-4.5 px-6 pt-7 pb-2 lg:max-w-130 lg:gap-5.5 lg:p-14">
        <h1 id="home-hero-title" className="sr-only">
          {t('headline')}
        </h1>
        <p aria-hidden="true" className="m-0 flex items-center gap-2">
          <img src={markDark} alt="" width={64} height={64} className="h-16 w-auto lg:h-21.5" />
          <span className="text-[52px] leading-[52px] font-medium tracking-[-0.02em] text-papel lg:text-[72px] lg:leading-[72px]">vera</span>
        </p>
        <p className="m-0 max-w-105 text-body text-papel/90">{t('homeLead')}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onNewExam} className={`${PILL} inline-flex border-0 bg-papel text-noche`}>
            <PlusIcon className="size-4" />
            {t('newExam')}
          </button>
          <button
            type="button"
            onClick={onReference}
            aria-label={t('toolReferenceOpen')}
            className={`${PILL} hidden border border-solid border-papel/55 bg-papel/[0.06] text-papel lg:inline-flex`}
          >
            {t('referenceTitle')}
            <ArrowUpRightIcon className="size-4" />
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-37.5 overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-165">
        <img
          src={heroArt}
          alt=""
          width={640}
          height={400}
          decoding="async"
          fetchPriority="low"
          className="absolute top-[-20px] left-[15px] w-80 max-w-none lg:top-0 lg:right-[-20px] lg:left-auto lg:h-full lg:w-auto"
        />
      </div>
    </section>
  );
}
