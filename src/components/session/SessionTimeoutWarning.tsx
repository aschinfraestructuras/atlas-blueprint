import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionTimeoutWarningProps {
  open: boolean;
  onExtend: () => void;
}

export function SessionTimeoutWarning({ open, onExtend }: SessionTimeoutWarningProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Clock className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            {t("auth.session.timeoutTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t("auth.session.timeoutDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center">
          <AlertDialogAction onClick={onExtend}>
            {t("auth.session.continueSession")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
