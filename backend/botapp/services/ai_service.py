import os

from openai import OpenAI


def generate_ai_reply(system_prompt: str, user_message: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "Aniq ma'lumot uchun operatorimiz siz bilan bog'lanadi."

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return response.output_text or "Aniq ma'lumot uchun operatorimiz siz bilan bog'lanadi."
