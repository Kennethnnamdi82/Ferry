import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FerryLogo } from "@/components/FerryLogo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" />
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <FerryLogo size={32} withWordmark />
        </div>
        <h1 className="font-display text-7xl font-semibold tracking-tight">404</h1>
        <p className="mt-3 text-base text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild className="mt-7 h-11 px-6">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
