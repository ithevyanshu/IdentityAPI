import express from "express";
import { PrismaClient } from "@prisma/client";
import response from "./responseFormat";

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

app.get("/identify", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phone number is required" });
  }

  try {
    let userByEmail = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    let userByPhoneNumber = await prisma.user.findFirst({
      where: {
        phoneNumber,
      },
    });

    const exactMatch = await prisma.user.findFirst({
      where: {
        AND: [{ email }, { phoneNumber }],
      },
    });

    if (exactMatch) {
      return res.json(
        await response(email, phoneNumber).finally(() => prisma.$disconnect())
      );
    }

    if (!userByEmail && !userByPhoneNumber) {
      await prisma.user.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
        },
      });
    } else if (userByEmail && !userByPhoneNumber && phoneNumber !== "") {
      await prisma.user.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: userByEmail.id,
        },
      });
    } else if (!userByEmail && userByPhoneNumber && email !== "") {
      await prisma.user.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: userByPhoneNumber.id,
        },
      });
    }
    if (userByEmail && userByPhoneNumber) {
      if (!userByEmail.linkedId && !userByPhoneNumber.linkedId) {
        const firstDate = new Date(userByEmail.createdAt);
        const secondDate = new Date(userByPhoneNumber.createdAt);

        if (firstDate > secondDate) {
          await prisma.user.update({
            where: { id: userByEmail.id },
            data: {
              linkPrecedence: "secondary",
              linkedId: userByPhoneNumber.id,
            },
          });
        } else {
          await prisma.user.update({
            where: { id: userByPhoneNumber.id },
            data: {
              linkPrecedence: "secondary",
              linkedId: userByEmail.id,
            },
          });
        }
      } else if (userByEmail.linkedId && !userByPhoneNumber.linkedId) {
        await prisma.user.update({
          where: { id: userByPhoneNumber.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: userByEmail.linkedId,
          },
        });
      } else if (userByPhoneNumber.linkedId && !userByEmail.linkedId) {
        await prisma.user.update({
          where: { id: userByEmail.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: userByPhoneNumber.linkedId,
          },
        });
      }
    }
    res.json(
      await response(email, phoneNumber).finally(() => prisma.$disconnect())
    );
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/identify/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({
    where: {
      id: parseInt(id),
    },
  });
  res.json({ message: "User deleted" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});