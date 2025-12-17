// src/app/api/denuncias/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const denuncias = await prisma.denunciaTerreno.findMany({
      select: {
        id: true,
        latitude: true,
        longitude: true,
        descricao: true,
        fotoUrl: true,
        status: true,
        dataCriacao: true
      },
      orderBy: {
        dataCriacao: 'desc'
      }
    });

    return NextResponse.json(denuncias);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar denúncias' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const nome = formData.get('name') as string;
    const telefone = formData.get('phone') as string;
    const descricao = formData.get('description') as string;
    const latitude = formData.get('latitude');
    const longitude = formData.get('longitude');
    const file = formData.get('photo') as File;

    // Validação
    if (!nome || !telefone || !descricao || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' }, 
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Foto obrigatória' }, 
        { status: 400 }
      );
    }

    // Converte o arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para o Cloudinary
    const uploadResponse: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          folder: 'denuncias-roo',
          resource_type: 'image'
        }, 
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // Salva no banco de dados
    const novaDenuncia = await prisma.denunciaTerreno.create({
      data: {
        nomeDenunciante: nome,
        telefoneDenunciante: telefone,
        descricao: descricao,
        latitude: Number(latitude),
        longitude: Number(longitude),
        fotoUrl: uploadResponse.secure_url,
        status: 'pendente'
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: novaDenuncia 
    }, { status: 201 });

  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar denúncia',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}