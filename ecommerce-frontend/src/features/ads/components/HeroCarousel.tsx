import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useActiveCampaigns } from '../hooks/useAdCampaigns';
import { AdCampaign } from '../services/adCampaignService';
import heroBannerImg from '@/assets/hero-banner.jpg';

const AUTO_SLIDE_MS = 5000;

const DEFAULT_BANNER = {
  badge: 'Chiến dịch Mega Sale',
  title: 'Thiết bị gia dụng',
  titleAccent: 'thế hệ mới',
  description: 'Tối ưu hoá không gian sống với bộ sưu tập Home Appliances giảm đến 50%. Mua ngay hôm nay!',
  ctaLabel: 'Mua sắm ngay',
  ctaLink: '/products',
};

export default function HeroCarousel() {
  const { data: campaigns = [], isLoading } = useActiveCampaigns();
  const [idx, setIdx] = useState(0);

  const slides: AdCampaign[] = campaigns;
  const hasSlides = slides.length > 0;

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), AUTO_SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  // Reset index if data shrinks
  useEffect(() => {
    if (idx >= slides.length && slides.length > 0) setIdx(0);
  }, [idx, slides.length]);

  if (isLoading || !hasSlides) {
    return (
      <section className="relative mt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-white min-h-[400px] flex items-center shadow-sm border border-gray-100">
          <div
            className="absolute inset-0 bg-cover bg-[center_top_-4rem] opacity-30 mix-blend-multiply"
            style={{ backgroundImage: `url(${heroBannerImg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
          <div className="relative w-full px-8 md:px-16">
            <div className="max-w-xl">
              <div className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                {DEFAULT_BANNER.badge}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-secondary sm:text-5xl lg:text-6xl leading-tight">
                {DEFAULT_BANNER.title} <br />
                <span className="text-primary">{DEFAULT_BANNER.titleAccent}</span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 font-medium">{DEFAULT_BANNER.description}</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={DEFAULT_BANNER.ctaLink}
                  className="rounded-full bg-primary px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-primary/20 hover:bg-orange-600 transition-all duration-300 hover:-translate-y-1"
                >
                  {DEFAULT_BANNER.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const cur = slides[idx];
  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIdx((i) => (i + 1) % slides.length);

  return (
    <section className="relative mt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="relative overflow-hidden rounded-2xl bg-white min-h-[400px] shadow-sm border border-gray-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Link
              to={`/shop/${cur.sellerId}`}
              aria-label={cur.title}
              className="block w-full h-full"
            >
              <img
                src={cur.bannerUrl}
                alt={cur.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </Link>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md backdrop-blur-sm transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={next}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md backdrop-blur-sm transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === idx ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
