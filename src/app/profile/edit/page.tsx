import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EditProfileForm } from "@/components/edit-profile-form";

export default async function EditProfilePage() {
  // Server-side authentication and data fetching
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch user profile data server-side
  const userProfile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      email: true,
      avatar_url: true,
      bio: true,
    },
  });

  if (!userProfile) {
    redirect("/");
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
      <EditProfileForm initialData={userProfile} />
    </div>
  );
}
