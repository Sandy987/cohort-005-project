import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  layout("routes/layout.app.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("courses", "routes/courses/courses.tsx"),
    route("courses/:slug", "routes/courses/courses.$slug.tsx"),
    route("courses/:slug/:moduleId", "routes/courses/courses.$slug.$moduleId.tsx"),
    route("courses/:slug/purchase", "routes/courses/courses.$slug.purchase.tsx"),
    route("courses/:slug/refund", "routes/courses/courses.$slug.refund.ts"),
    route("courses/:slug/welcome", "routes/courses/courses.$slug.welcome.tsx"),
    route(
      "courses/:slug/lessons/:lessonId",
      "routes/courses/courses.$slug.lessons.$lessonId.tsx"
    ),
    route("instructor", "routes/instructor/instructor.tsx"),
    route("instructor/new", "routes/instructor/instructor.new.tsx"),
    route("instructor/questions", "routes/instructor/instructor.questions.tsx"),
    route("instructor/analytics", "routes/instructor/instructor.analytics.tsx"),
    route("instructor/:courseId", "routes/instructor/instructor.$courseId.tsx"),
    route(
      "instructor/:courseId/lessons/:lessonId",
      "routes/instructor/instructor.$courseId.lessons.$lessonId.tsx"
    ),
    route(
      "instructor/:courseId/lessons/:lessonId/quiz",
      "routes/instructor/instructor.$courseId.lessons.$lessonId.quiz.tsx"
    ),
    route(
      "instructor/:courseId/modules/:moduleId",
      "routes/instructor/instructor.$courseId.modules.$moduleId.tsx"
    ),
    route(
      "instructor/:courseId/students",
      "routes/instructor/instructor.$courseId.students.tsx"
    ),
    route("admin/users", "routes/admin/admin.users.tsx"),
    route("admin/courses", "routes/admin/admin.courses.tsx"),
    route("admin/categories", "routes/admin/admin.categories.tsx"),
    route("admin/refunds", "routes/admin/admin.refunds.tsx"),
    route("settings", "routes/settings.tsx"),
    route("team", "routes/team.tsx"),
    route("notifications", "routes/notifications.tsx"),
    route("redeem/:code", "routes/redeem.$code.tsx"),
  ]),
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("api/switch-user", "routes/api/api.switch-user.ts"),
  route("api/logout", "routes/api/api.logout.ts"),
  route("api/video-tracking", "routes/api/api.video-tracking.ts"),
  route("api/set-dev-country", "routes/api/api.set-dev-country.ts"),
  route("api/knock-token", "routes/api/api.knock-token.ts"),
] satisfies RouteConfig;
