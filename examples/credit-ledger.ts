/**
 * In-memory illustration of append-only usage accounting.
 * A production implementation needs transactional persistence and unique
 * constraints for account, reference, and entry kind.
 */
type Kind = "grant" | "reserve" | "settle" | "release";
interface Entry { accountId: string; reference: string; kind: Kind; amount: number }

export class CreditLedger {
  private entries: Entry[] = [];

  balance(accountId: string): number {
    return this.entries.filter(e => e.accountId === accountId).reduce((sum, e) => {
      if (e.kind === "grant" || e.kind === "release") return sum + e.amount;
      if (e.kind === "reserve") return sum - e.amount;
      return sum; // Settlement closes a reservation; it does not deduct twice.
    }, 0);
  }

  grant(accountId: string, reference: string, amount: number): void {
    this.validate(amount);
    this.append({ accountId, reference, kind: "grant", amount });
  }

  reserve(accountId: string, reference: string, amount: number): void {
    this.validate(amount);
    if (this.has(accountId, reference, "reserve")) throw new Error("Duplicate reservation");
    if (this.balance(accountId) < amount) throw new Error("Insufficient credits");
    this.append({ accountId, reference, kind: "reserve", amount });
  }

  settle(accountId: string, reference: string): void {
    const reservation = this.find(accountId, reference, "reserve");
    if (!reservation) throw new Error("Reservation not found");
    if (this.has(accountId, reference, "settle") || this.has(accountId, reference, "release")) {
      throw new Error("Reservation already closed");
    }
    this.append({ ...reservation, kind: "settle" });
  }

  release(accountId: string, reference: string): void {
    const reservation = this.find(accountId, reference, "reserve");
    if (!reservation) throw new Error("Reservation not found");
    if (this.has(accountId, reference, "settle") || this.has(accountId, reference, "release")) {
      throw new Error("Reservation already closed");
    }
    this.append({ ...reservation, kind: "release" });
  }

  private append(entry: Entry) { this.entries.push(entry); }
  private find(accountId: string, reference: string, kind: Kind) {
    return this.entries.find(e => e.accountId === accountId && e.reference === reference && e.kind === kind);
  }
  private has(accountId: string, reference: string, kind: Kind) {
    return Boolean(this.find(accountId, reference, kind));
  }
  private validate(amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Amount must be a positive integer");
  }
}
