import PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { config } from '../config/index.js';

interface ProcesoData {
  id: string;
  codigo: string;
  formulario: Record<string, unknown> | null;
  beneficiario: {
    nombreCompleto: string;
    cedula: string;
    email?: string;
  };
  arrendador?: {
    nombreCompleto: string;
  } | null;
  pdfVersion: number;
}

export class PdfService {
  private outputPath: string;

  constructor() {
    this.outputPath = path.join(config.upload.path, 'pdf');
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, { recursive: true });
    }
  }

  /**
   * Generate PDF for a process
   */
  async generatePdf(proceso: ProcesoData): Promise<{ path: string; hash: string }> {
    const filename = `${proceso.codigo}_v${proceso.pdfVersion + 1}.pdf`;
    const filePath = path.join(this.outputPath, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: `Solicitud de Subvención - ${proceso.codigo}`,
          Author: config.pdf.companyName,
          Subject: 'Solicitud de Subvención Económica',
          Creator: 'Sistema de Gestión de Subvenciones',
        },
      });

      const stream = createWriteStream(filePath);
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const hash = createHash('sha256').update(pdfBuffer).digest('hex');
        resolve({ path: filePath, hash });
      });
      doc.on('error', reject);

      doc.pipe(stream);

      // Generate PDF content
      this.generateHeader(doc, proceso);
      this.generateBeneficiaryInfo(doc, proceso);
      this.generateFormData(doc, proceso);
      this.generateFooter(doc, proceso);

      doc.end();
    });
  }

  private generateHeader(doc: PDFKit.PDFDocument, proceso: ProcesoData) {
    // Header
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(config.pdf.companyName, { align: 'center' });

    if (config.pdf.companyAddress) {
      doc.fontSize(10)
         .font('Helvetica')
         .text(config.pdf.companyAddress, { align: 'center' });
    }

    doc.moveDown(2);

    // Title
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('SOLICITUD DE SUBVENCIÓN ECONÓMICA', { align: 'center' });

    doc.moveDown();

    // Process code
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Código de Proceso: ${proceso.codigo}`, { align: 'center' });

    doc.moveDown();

    // Line separator
    doc.strokeColor('#000000')
       .lineWidth(1)
       .moveTo(72, doc.y)
       .lineTo(540, doc.y)
       .stroke();

    doc.moveDown();
  }

  private generateBeneficiaryInfo(doc: PDFKit.PDFDocument, proceso: ProcesoData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('DATOS DEL BENEFICIARIO');

    doc.moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica');

    const beneficiario = proceso.beneficiario;

    this.addLabelValue(doc, 'Nombre Completo:', beneficiario.nombreCompleto);
    this.addLabelValue(doc, 'Cédula de Identidad:', beneficiario.cedula);
    if (beneficiario.email) {
      this.addLabelValue(doc, 'Correo Electrónico:', beneficiario.email);
    }

    if (proceso.arrendador) {
      doc.moveDown();
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('DATOS DEL ARRENDADOR');

      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica');

      this.addLabelValue(doc, 'Nombre Completo:', proceso.arrendador.nombreCompleto);
    }

    doc.moveDown();

    // Line separator
    doc.strokeColor('#cccccc')
       .lineWidth(0.5)
       .moveTo(72, doc.y)
       .lineTo(540, doc.y)
       .stroke();

    doc.moveDown();
  }

  private generateFormData(doc: PDFKit.PDFDocument, proceso: ProcesoData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('INFORMACIÓN DE LA SOLICITUD');

    doc.moveDown(0.5);

    if (!proceso.formulario) {
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .text('No se ha completado el formulario.');
      return;
    }

    doc.fontSize(10)
       .font('Helvetica');

    const form = proceso.formulario as Record<string, unknown>;

    // Map field names to labels
    const fieldLabels: Record<string, string> = {
      montoSolicitado: 'Monto Solicitado',
      montoArriendo: 'Monto del Arriendo',
      ingresoFamiliar: 'Ingreso Familiar',
      cantidadIntegrantes: 'Cantidad de Integrantes',
      direccionPropiedad: 'Dirección de la Propiedad',
      comunaPropiedad: 'Comuna',
      motivoSolicitud: 'Motivo de la Solicitud',
    };

    for (const [key, value] of Object.entries(form)) {
      const label = fieldLabels[key] || key;
      let displayValue = String(value);

      // Format currency values
      if (['montoSolicitado', 'montoArriendo', 'ingresoFamiliar'].includes(key)) {
        displayValue = this.formatCurrency(Number(value));
      }

      if (key === 'motivoSolicitud') {
        // Long text field
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`${label}:`);
        doc.font('Helvetica').text(displayValue, {
          indent: 20,
          align: 'justify',
        });
      } else {
        this.addLabelValue(doc, `${label}:`, displayValue);
      }
    }

    doc.moveDown();
  }

  private generateFooter(doc: PDFKit.PDFDocument, proceso: ProcesoData) {
    // Move to bottom of page
    const pageHeight = doc.page.height;
    const bottomMargin = 72;

    doc.y = pageHeight - bottomMargin - 150;

    // Signature area
    doc.strokeColor('#000000')
       .lineWidth(0.5);

    // Line for signature
    doc.moveTo(72, doc.y + 80)
       .lineTo(270, doc.y + 80)
       .stroke();

    doc.fontSize(10)
       .font('Helvetica')
       .text('Firma del Ordenador del Gasto', 72, doc.y + 85, { width: 200, align: 'center' });

    // Line for date
    doc.moveTo(330, doc.y - 5)
       .lineTo(540, doc.y - 5)
       .stroke();

    doc.text('Fecha', 330, doc.y, { width: 210, align: 'center' });

    doc.moveDown(4);

    // Document hash placeholder
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`Código: ${proceso.codigo}`, { align: 'center' });

    doc.text(`Versión: ${proceso.pdfVersion + 1}`, { align: 'center' });

    doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, { align: 'center' });

    doc.text('Este documento requiere firma electrónica para su validez', { align: 'center' });
  }

  private addLabelValue(doc: PDFKit.PDFDocument, label: string, value: string) {
    const startY = doc.y;
    
    doc.font('Helvetica-Bold')
       .text(label, 72, startY, { continued: true, width: 150 });
    
    doc.font('Helvetica')
       .text(` ${value}`, { width: 350 });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  }
}

export const pdfService = new PdfService();
