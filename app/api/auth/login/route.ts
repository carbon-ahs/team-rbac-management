import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/app/lib/db";
import {generateToken, verifyPassword} from "@/app/lib/auth";
import {Role} from "@/app/types";

export async function POST(request: NextRequest) {
    try {
        const {email, password} = await request.json();
        if (!email || !password) {
            return NextResponse.json({
                error: 'Email and password is required or not valid'
            }, {status: 400});
        }

        const userFromDb = await prisma.user.findUnique({
            where: {email},
            include: {team : true}
        });

        if (!userFromDb) {
            return NextResponse.json({
                error: 'User not found',
            }, {status: 401})
        }


        const isValidPassword = await verifyPassword(password, userFromDb.password);

        if (!isValidPassword) {
            return NextResponse.json({
                error: 'Invalid password',
            }, {status: 401})
        }

        // generate token
        const token = generateToken(userFromDb.id)

        const response = NextResponse.json({
            user: {
                id: userFromDb.id,
                email: userFromDb.email,
                name: userFromDb.name,
                role: userFromDb.role,
                teamId: userFromDb.teamId,
                team: userFromDb.team,
                token
            }
        })

        // set cookie
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7
        })

        return response;
    } catch (e) {
        console.error("Login failed", e);
        return NextResponse.json({error: "Internal Server Error",}, {status: 500});
    }
}