class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferFill = 0;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    
    if (input && output) {
      // Copy input to output
      output.set(input);
      
      // Fill the buffer
      for (let i = 0; i < input.length; i++) {
        if (this.bufferFill < this.bufferSize) {
          this.buffer[this.bufferFill++] = input[i];
        }
      }
      
      // If buffer is full, send it
      if (this.bufferFill >= this.bufferSize) {
        this.port.postMessage({type: 'buffer', buffer: this.buffer.slice(0)});
        this.bufferFill = 0;
      }
    }
    
    return true; // Keep processing
  }
}

registerProcessor('audio-processor', AudioProcessor);
