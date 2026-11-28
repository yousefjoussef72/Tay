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
        .select("title,slug,excerpt,content,cover_url,track_id,subject_id,grade_level,curriculum_year,published_at,created_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      let enriched = data;
      if (data) {
        const [trackResult, subjectResult] = await Promise.all([
          data.track_id ? supabase.from("learning_tracks").select("name").eq("id", data.track_id).maybeSingle() : Promise.resolve({ data: null }),
          data.subject_id ? supabase.from("learning_subjects").select("name").eq("id", data.subject_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        enriched = {
          ...data,
          track_name: trackResult.data?.name || "",
          subject_name: subjectResult.data?.name || "",
        };
      }

      if (!active) return;
      if (error || !data) {
        setArticle(null);
        setNotFound(true);
      } else {
        setArticle(enriched);
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
        {(article.track_name || article.subject_name || article.grade_level) && <div className="article-page-curriculum">{[article.track_name,article.subject_name,article.grade_level].filter(Boolean).join(" · ")}</div>}
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
