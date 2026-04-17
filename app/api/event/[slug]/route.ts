import { NextResponse } from "next/server";
import { findEventBySlug, type EventOdds } from "@/lib/polymarket-event";

export const dynamic = "force-dynamic";

type EventResponse = {
  updatedAt: string;
  game: EventOdds | null;
  error?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const game = await findEventBySlug(slug);

    if (!game) {
      return NextResponse.json(
        {
          updatedAt: new Date().toISOString(),
          game: null,
          error: "Event not found",
        } satisfies EventResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      game,
    } satisfies EventResponse);
  } catch (error) {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        game: null,
        error: error instanceof Error ? error.message : "Fetch failed",
      } satisfies EventResponse,
      { status: 500 }
    );
  }
}