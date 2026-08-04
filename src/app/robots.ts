import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quadencode.com';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/study/'],
      disallow: ['/dashboard', '/notes', '/practice', '/review', '/imports', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
