const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

export default async function response(email: any, phoneNumber: any) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phoneNumber }],
    },
  });

  const id = user?.linkPrecedence === "primary" ? user?.id : user?.linkedId;

  const data = await prisma.user.findMany({
    where: {
      linkedId: id,
    },
  });

  const primaryUser =
    user?.linkPrecedence === "primary"
      ? user
      : await prisma.user.findFirst({
          where: {
            id,
          },
        });

  const response = {
    contact: {
      primaryContactId: primaryUser?.id,
      emails: [
        primaryUser?.email,
        ...data.map((c) => c.email).filter((p) => p !== primaryUser?.email),
      ],
      phoneNumbers: [
        primaryUser?.phoneNumber,
        ...data
          .map((c) => c.phoneNumber)
          .filter((p) => p !== primaryUser?.phoneNumber),
      ],
      secondaryContactIds: data
        .filter((c) => c.linkPrecedence === "secondary")
        .map((c) => c.id),
    },
  };
  return response;
}
