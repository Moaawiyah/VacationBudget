import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        Log out
      </Button>
    </form>
  );
}
