import Link from "next/link";
import type { ArticleListItem } from "@/lib/articles/list";

type ArticleListProps = {
  articles: ArticleListItem[];
};

export function ArticleList({ articles }: ArticleListProps) {
  if (articles.length === 0) {
    return <p className="article-list-empty">No published articles yet.</p>;
  }

  return (
    <ul className="article-list">
      {articles.map((article) => (
        <li key={article.slug} className="article-list-item">
          <article>
            <h2 className="article-list-title">
              <Link href={article.href}>{article.title}</Link>
            </h2>
            <p className="article-list-meta">
              <time dateTime={article.publishDate}>{article.publishDate}</time>
            </p>
            {article.description ? (
              <p className="article-list-description">{article.description}</p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
