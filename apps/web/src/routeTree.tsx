import { QueryClient, useQuery } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  createRoute,
} from "@tanstack/react-router";
import { ArticleReader } from "./screens/ArticleReader";
import { TodayScreen } from "./screens/TodayScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { Masthead } from "./ui/Masthead";
import { getArticle, getToday } from "./services/api";

type RouterContext = {
  queryClient: QueryClient;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <main className="app-shell">
      <Masthead />
      <Outlet />
      <nav className="bottom-nav" aria-label="Primary">
        <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }}>
          Hoje
        </Link>
        <Link to="/review" activeProps={{ className: "active" }}>
          Revisão
        </Link>
      </nav>
    </main>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["today"],
      queryFn: getToday,
    }),
  component: TodayScreen,
});

const articleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/article/$articleId",
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["article", params.articleId],
      queryFn: () => getArticle(params.articleId),
    }),
  component: () => {
    const { articleId } = articleRoute.useParams();
    const article = useQuery({
      queryKey: ["article", articleId],
      queryFn: () => getArticle(articleId),
    });

    if (!article.data) return <p className="loading-line">A compor a página…</p>;
    return <ArticleReader article={article.data} />;
  },
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review",
  component: ReviewScreen,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  articleRoute,
  reviewRoute,
]);
