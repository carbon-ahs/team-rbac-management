
import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/app/lib/db";
import {generateToken, hashPassword} from "@/app/lib/auth";
import {Role} from "@/app/types";

export async function POST(request: NextRequest) {

    console.log('JWT_SECRET present?', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET value:', process.env.JWT_SECRET);
    try {
        const {name, email, password, teamCode} = await request.json();
        if (!name || !email || !password) {
            return NextResponse.json({error: 'Name, email and password is required or not valid'}, {status: 400});
        }

        const existingUser = await prisma.user.findUnique({where: {email}});
        if (existingUser) {
            return NextResponse.json({error: 'User with this mail already exites'}, {status: 409});
        }

        let teamId: string | undefined;
        if (teamCode) {
            const team = await prisma.team.findUnique({
                where: {code: teamCode},
            })

            if (!team) {
                return NextResponse.json({error: "Please enter a valid team code"}, {status: 400})
            }
            teamId = team.id;

        }
        const hashedPassword = await hashPassword(password);

        // first user admin, next users
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? Role.ADMIN : Role.USER;

        const user = await prisma.user.create({
            data: {
                name, email, password: hashedPassword, role, teamId,
            }, include: {
                team: true,
            }
        });

        // generate token
        const token = generateToken(user.id)

        const response = NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                teamId: user.teamId,
                team: user.team,
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
        console.error("Registration error", e);
        return NextResponse.json({error: "Internal Server Error",}, {status: 500});
    }
}