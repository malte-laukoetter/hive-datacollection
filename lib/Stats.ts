export class Stats {
  private static stats: Map<string, number> = new Map();

  static track(key: string){
    this.stats.set(key, (this.stats.get(key) || 0) + 1)
  }

  static print(){
    console.log(`=================== Statistics ===================`);
    console.log('');
    
    [... this.stats.entries()].forEach(([key, val]) => {
      console.log(`${key}: ${val}`);
    });
    
    console.log('');
  }
}