"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const questions = [
  { id: "information", question: "¿Qué información debo enviar?", answer: "Comparte el código, modelo o una foto de la placa. Con esos datos revisamos la referencia publicada y el siguiente paso." },
  { id: "original", question: "¿Los repuestos son originales?", answer: "La condición y procedencia se confirman en la cotización comercial vigente; no presentamos una afirmación que no esté respaldada en la ficha." },
  { id: "response", question: "¿Cuánto demora la respuesta?", answer: "El tiempo depende de la información y disponibilidad. El equipo comercial confirma el plazo al registrar tu solicitud." },
] as const;

export function HomeFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="home-faq-block">
      <div>
        <h2 className="home-help-title">Antes de solicitar tu cotización</h2>
        <p className="home-help-subtitle">Te ayudamos a preparar tu solicitud</p>
      </div>
      <div className="home-faq-list">
        {questions.map((item) => {
          const open = openId === item.id;
          const answerId = `home-faq-${item.id}`;
          return (
            <div key={item.id} className="home-faq-item">
              <button type="button" aria-expanded={open} aria-controls={answerId} onClick={() => setOpenId(open ? null : item.id)}>
                <span>{item.question}</span>
                <ChevronDown className={open ? "rotate-180" : ""} aria-hidden="true" />
              </button>
              {open ? <p id={answerId}>{item.answer}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
