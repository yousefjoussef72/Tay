import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, FileText } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import "./article-page.css";
import { useSiteCopy } from "./siteCopy.js";

export default function ArticlePage() {
  const { copy } = useSiteCopy();
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadArticle() {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("articles")
        .select("title,slug,excerpt,content,cover_url,published_at,created_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setArticle(null);
        setNotFound(true);
      } else {
        setArticle(data);
      }
      setLoading(false);
    }

    loadArticle();
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return <main className="article-page"><div className="article-page-card">جارٍ تحميل المقال...</div></main>;
  }

  if (notFound) {
    return (
      <main className="article-page">
        <div className="article-page-card article-not-found">
          <FileText size={30} />
          <h1>{copy.articlePageNotFound}</h1>
          <p>{copy.articlePageNotFoundBody}</p>
          <Link to="/" className="article-back-link"><ArrowRight size={16} /> {copy.articlePageBack}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="article-page">
      <div className="article-page-top">
        <Link to="/" className="article-back-link"><ArrowRight size={16} /> العودة إلى الرئيسية</Link>
        <span className="article-page-brand">{copy.articlePageBrand}</span>
      </div>
      <article className="article-page-card">
        <span className="article-page-label">{copy.articlePageLabel}</span>
        <h1>{article.title}</h1>
        {article.published_at && (
          <div className="article-page-date">
            <CalendarDays size={15} />
            <time dateTime={article.published_at}>
              {new Date(article.published_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
            </time>
          </div>
        )}
        {article.cover_url && <img className="article-page-cover" src={article.cover_url} alt={article.title} />}
        {article.excerpt && <p className="article-page-excerpt">{article.excerpt}</p>}
        <div className="article-page-content">{article.content || copy.articlePageMissingContent}</div>
      </article>
      <div className="article-page-bottom">
        <Link to="/" className="article-back-link"><ArrowRight size={16} /> {copy.articlePageBrowseMore}</Link>
      </div>
    </main>
  );
}
