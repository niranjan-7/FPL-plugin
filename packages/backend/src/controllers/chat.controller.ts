import { Request, Response } from 'express';
import { geminiService } from '../ai/gemini.service.js';

export async function handleChat(req: Request, res: Response): Promise<void> {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message string is required in request body' });
      return;
    }

    const response = await geminiService.processChat(message, context);
    res.json(response);
  } catch (err) {
    console.error('Error in chat controller:', err);
    res.status(500).json({ error: 'Failed to process chat query' });
  }
}
