import Image from "next/image";
import { testimonials } from "@/data/testimonials";
import { Badge } from "@/components/shared/Badge";
import { SectionTitle } from "@/components/shared/SectionTitle";

type Testimonial = (typeof testimonials)[number];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="testimonial-card w-[20rem] shrink-0 rounded-md border border-border bg-white p-6 shadow-card sm:w-[22rem] lg:w-[24rem]">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-background">
          <Image
            src={testimonial.image}
            alt={`Referencia comercial: ${testimonial.name}`}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div>
          <h3 className="font-extrabold text-dark">{testimonial.name}</h3>
          <p className="text-sm font-semibold text-gray-text">
            {testimonial.city} · {testimonial.role}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-gray-text">“{testimonial.quote}”</p>

      <div className="mt-5">
        <Badge variant="tech">{testimonial.purchaseType}</Badge>
      </div>
    </article>
  );
}

function TestimonialRow({
  items,
  reverse = false,
}: {
  items: readonly Testimonial[];
  reverse?: boolean;
}) {
  const loopItems = [...items, ...items];
  const motionClass = reverse ? "testimonial-flow-reverse" : "testimonial-flow";

  return (
    <div className="testimonials-cinema-track relative overflow-hidden py-1">
      <div aria-hidden="true" className={`testimonial-cinema-blur flex w-max gap-5 ${motionClass}`}>
        {loopItems.map((testimonial, index) => (
          <TestimonialCard key={`blur-${testimonial.id}-${index}`} testimonial={testimonial} />
        ))}
      </div>

      <div className={`relative z-[1] flex w-max gap-5 ${motionClass}`}>
        {loopItems.map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  const firstRow = testimonials.filter((_, index) => index % 3 === 0);
  const secondRow = testimonials.filter((_, index) => index % 3 === 1);
  const thirdRow = testimonials.filter((_, index) => index % 3 === 2);

  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Confianza"
          title="Cotizaciones pensadas para compras tecnicas"
          description="Historias representativas de atencion asistida: compatibilidad, rapidez y claridad antes de coordinar una compra tecnica critica."
          align="center"
        />
      </div>

      <div className="mt-10 w-full space-y-5 overflow-hidden">
        <TestimonialRow items={firstRow} />
        <TestimonialRow items={secondRow} reverse />
        <TestimonialRow items={thirdRow} />
      </div>
    </section>
  );
}
