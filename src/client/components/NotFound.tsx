import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>404</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {t("notFound.message")}
        </CardContent>
        <CardFooter>
          <Button nativeButton={false} render={<Link to="/" />}>
            {t("actions.home")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
