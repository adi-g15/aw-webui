import _ from 'lodash';

import { IBucket } from '~/util/interfaces';
import { defineStore } from 'pinia';
import { getClient } from '~/util/awclient';

function select_buckets(
  buckets: IBucket[],
  { host, type }: { host?: string; type?: string }
): string[] {
  return _.map(
    _.filter(
      buckets,
      bucket => (!type || bucket['type'] === type) && (!host || bucket['hostname'] == host)
    ),
    bucket => bucket['id']
  );
}

interface State {
  buckets: IBucket[];
}

export const useBucketsStore = defineStore('buckets', {
  state: (): State => ({
    buckets: [],
  }),

  getters: {
    hosts(this: State): string[] {
      // TODO: Include consideration of device_id UUID
      return _.uniq(_.map(this.buckets, bucket => bucket['hostname']));
    },
    // Uses device_id instead of hostname
    devices(this: State): string[] {
      // TODO: Include consideration of device_id UUID
      return _.uniq(_.map(this.buckets, bucket => bucket['device_id']));
    },

    available(): (hostname: string) => {
      window: boolean;
      browser: boolean;
      editor: boolean;
      android: boolean;
      category: boolean;
    } {
      // Returns a map of which kinds of buckets are available
      //
      // 'window' requires ((currentwindow + afkstatus) or android) buckets
      // 'browser' requires (currentwindow + afk + browser) buckets
      // 'editor' requires editor buckets
      return hostname => {
        const windowAvail =
          this.bucketsWindow(hostname).length > 0 && this.bucketsAFK(hostname).length > 0;
        const androidAvail = this.bucketsAndroid(hostname).length > 0;

        return {
          window: windowAvail,
          browser: windowAvail && this.bucketsBrowser(hostname).length > 0,
          editor: this.bucketsEditor(hostname).length > 0,
          android: androidAvail,
          category: windowAvail || androidAvail,
        };
      };
    },

    // These should be considered low-level, and should be used sparingly.
    bucketsAFK(this: State): (host: string) => string[] {
      return host => select_buckets(this.buckets, { host, type: 'afkstatus' });
    },
    bucketsWindow(this: State): (host: string) => string[] {
      return host =>
        _.filter(
          select_buckets(this.buckets, { host, type: 'currentwindow' }),
          id => !id.startsWith('aw-watcher-android')
        );
    },
    bucketsAndroid(this: State): (host: string) => string[] {
      return host =>
        _.filter(select_buckets(this.buckets, { host, type: 'currentwindow' }), id =>
          id.startsWith('aw-watcher-android')
        );
    },
    bucketsEditor(this: State): (host: string) => string[] {
      // fallback to a bucket with 'unknown' host, if one exists.
      // TODO: This needs a fix so we can get rid of this workaround.
      const type = 'app.editor.activity';
      return (host: string) => {
        const buckets = select_buckets(this.buckets, { host, type });
        return buckets.length == 0
          ? select_buckets(this.buckets, { host: 'unknown', type })
          : buckets;
      };
    },
    bucketsBrowser(this: State): (host: string) => string[] {
      // fallback to a bucket with 'unknown' host, if one exists.
      // TODO: This needs a fix so we can get rid of this workaround.
      const type = 'web.tab.current';
      return (host: string) => {
        const buckets = select_buckets(this.buckets, { host, type });
        if (buckets.length > 0) {
          return buckets;
        } else {
          console.log('fallback: ', select_buckets(this.buckets, { host: 'unknown', type }));
          return select_buckets(this.buckets, { host: 'unknown', type });
        }
      };
    },

    getBucket(this: State): (id: string) => IBucket {
      return id => _.filter(this.buckets, b => b.id === id)[0];
    },
    bucketsByHostname(this: State): Record<string, IBucket[]> {
      return _.groupBy(this.buckets, 'hostname');
    },
  },

  actions: {
    async ensureLoaded(): Promise<void> {
      if (this.buckets.length === 0) {
        await this.loadBuckets();
      }
    },

    async loadBuckets(): Promise<void> {
      const buckets = await getClient().getBuckets();
      this.update_buckets(buckets);
    },

    async getBucketWithEvents({
      id,
      start,
      end,
      limit,
    }: {
      id: string;
      start?: Date;
      end?: Date;
      limit?: number;
    }) {
      await this.ensureLoaded();
      const bucket = _.cloneDeep(this.getBucket(id));
      bucket.events = await getClient().getEvents(bucket.id, {
        start,
        end,
        limit: limit || -1,
      });
      return bucket;
    },

    async getBucketsWithEvents({ start, end }: { start?: Date; end?: Date }) {
      await this.ensureLoaded();
      const buckets = await Promise.all(
        _.map(
          this.buckets,
          async bucket => await this.getBucketWithEvents({ id: bucket.id, start, end })
        )
      );
      return _.orderBy(buckets, [b => b.id], ['asc']);
    },

    async deleteBucket({ bucketId }: { bucketId: string }) {
      console.log(`Deleting bucket ${bucketId}`);
      await getClient().deleteBucket(bucketId);
      await this.loadBuckets();
    },

    // mutations
    update_buckets(this: State, buckets: IBucket[]): void {
      this.buckets = buckets;
    },
  },
});
