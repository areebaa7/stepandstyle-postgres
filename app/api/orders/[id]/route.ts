import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    // Handle both Next.js 14 (sync) and Next.js 15 (async) params safely
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const orderId = resolvedParams?.id;
    
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is missing.' }, { status: 400 });
    }

    const rawBody = await request.json().catch(() => null);
    console.log('--- INCOMING ORDER UPDATE REQUEST ---');
    console.log('Order ID:', orderId);
    console.log('Request Body:', rawBody);

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }

    const body = rawBody as Record<string, unknown>;
    
    let statusInput = body.status || body.action || body.state || body.newStatus || '';
    let cleanStatus = typeof statusInput === 'string' ? statusInput.trim().toUpperCase() : '';

    // Map actions to your schema's OrderStatus enum: PENDING, PAID, SHIPPED, COMPLETED, CANCELLED
    if (cleanStatus === 'CONFIRM' || cleanStatus === 'CONFIRMED' || cleanStatus === 'APPROVE') {
      cleanStatus = 'PAID'; 
    }
    if (cleanStatus === 'DISAPPROVE' || cleanStatus === 'REJECT' || cleanStatus === 'CANCEL') {
      cleanStatus = 'CANCELLED';
    }

    const paymentStatusInput = body.paymentStatus;
    let cleanPaymentStatus = typeof paymentStatusInput === 'string' ? paymentStatusInput.trim().toUpperCase() : undefined;
    
    // Map payment status if needed (schema uses: PENDING, APPROVED, DISAPPROVED)
    if (cleanPaymentStatus === 'CONFIRM') cleanPaymentStatus = 'APPROVED';
    if (cleanPaymentStatus === 'DISAPPROVE') cleanPaymentStatus = 'DISAPPROVED';

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (cleanStatus) updateData.status = cleanStatus;
    if (cleanPaymentStatus) updateData.paymentStatus = cleanPaymentStatus;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid status or paymentStatus provided in request body.' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully.',
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error('SERVER CRASH IN ORDER UPDATE:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Internal Server Error',
        code: error?.code 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return PATCH(request, context);
}