import { MetadataRoute } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quadencode.com';
  const supabase = await createClient();

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  ];

  // Public registry of searched slugs — decoupled from the private, per-user
  // `subjects` table, which RLS would filter to nothing for an anonymous crawler.
  const { data: indexedSubjects } = await supabase
    .from('indexed_subjects')
    .select('slug, first_searched_at')
    .order('first_searched_at', { ascending: false })
    .limit(1000);

  if (indexedSubjects) {
    indexedSubjects.forEach((s: { slug: string; first_searched_at: string }) => {
      routes.push({
        url: `${baseUrl}/study/${s.slug}`,
        lastModified: new Date(s.first_searched_at),
        changeFrequency: 'weekly',
        priority: 0.9, // Study pages are important for SEO
      });
    });
  }

  return routes;
}
