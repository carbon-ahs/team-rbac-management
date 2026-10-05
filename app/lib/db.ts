import {PrismaClient} from "@prisma/client";

export const prisma = new PrismaClient();

export async function checkDatabaseConnection() : Promise<boolean> {
    try {
        await prisma.$queryRaw`Select 1`
        return true
    } catch(e) {
        console.error(`Db connection failed: ${e}`);
        return false;
    }
}